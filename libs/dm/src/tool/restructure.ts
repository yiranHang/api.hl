import {
  DataSource,
  Driver,
  EntityMetadata,
  InsertQueryBuilder,
  SelectQueryBuilder,
  Table,
  TableIndex
} from 'typeorm'
import { v4 as uuidv4 } from 'uuid'
import { DriverFactory } from 'typeorm/driver/DriverFactory'
import { RdbmsSchemaBuilder } from 'typeorm/schema-builder/RdbmsSchemaBuilder'
import { DmDriver } from '../driver/dm/DmDriver'
import { ColumnMetadata } from 'typeorm/metadata/ColumnMetadata'
import { DriverUtils } from 'typeorm/driver/DriverUtils'
import { AuroraMysqlDriver } from 'typeorm/driver/aurora-mysql/AuroraMysqlDriver'
import { MysqlDriver } from 'typeorm/driver/mysql/MysqlDriver'
import { SqlServerDriver } from 'typeorm/driver/sqlserver/SqlServerDriver'
import { SelectQuery } from 'typeorm/query-builder/SelectQuery'
export class Restructure {
  /**
   * 重构DriverFactory.create 支持dm 数据库
   */
  private static driverFactoryCreate = () => {
    const oldCreate = DriverFactory.prototype.create
    DriverFactory.prototype.create = (connection: DataSource): Driver => {
      const { type } = connection.options as { type: string }
      switch (type) {
        case 'dm':
          return new DmDriver(connection) as Driver
        default:
          return oldCreate(connection)
      }
    }
  }

  /**
   * 重构RdbmsSchemaBuilder.dropOldIndices dm 数据库添加特殊判断
   */
  private static rdbmsSchemaBuilderDropOldIndices = () => {
    /** 是否删除索引特殊判断，当列为外键或者主键时，不能直接删除索引 */
    const specialJudge = (metadata: EntityMetadata, tableIndex: TableIndex) => {
      const isPrimary = metadata.primaryColumns.find(
        index => index.databaseName === tableIndex.columnNames[0]
      )
      const isForeign = metadata.foreignKeys.find(
        index => index.columnNames[0] === tableIndex.columnNames[0]
      )

      const isUniques = () => {
        const find = metadata.uniques.some(index => {
          return index.columns?.[0].givenDatabaseName === tableIndex.columnNames?.[0]
        })
        if (!find && tableIndex.columnNames?.[0]) {
          return true
        }
        return find
      }
      if (isPrimary || isForeign || isUniques()) {
        return true
      }
      return false
    }
    /** 重构删除索引函数，添加特殊判断 */
    RdbmsSchemaBuilder.prototype['dropOldIndices'] = async function () {
      for (const metadata of this.entityToSyncMetadatas) {
        const table = this.queryRunner.loadedTables.find(
          (table: Table) => this.getTablePath(table) === this.getTablePath(metadata)
        )
        if (!table) {
          continue
        }
        const dropQueries = table.indices.filter((tableIndex: TableIndex) => {
          const indexMetadata = metadata.indices.find(
            (index: TableIndex) => index.name === tableIndex.name
          )

          /**此处判断新加(达梦)(start) */
          const isDm = this.connection.driver.options.type === 'dm'
          if (isDm) {
            const special = specialJudge(metadata, tableIndex)
            if (special) {
              return false
            }
          }
          /** end */
          if (indexMetadata) {
            if (indexMetadata.synchronize === false) {
              return false
            }
            if (indexMetadata.isUnique !== tableIndex.isUnique) {
              return true
            }
            /** 达梦数据库空间索引和一般索引一样操作 */
            if (!isDm && indexMetadata.isSpatial !== tableIndex.isSpatial) {
              return true
            }
            if (
              this.connection.driver.isFullTextColumnTypeSupported() &&
              indexMetadata.isFulltext !== tableIndex.isFulltext
            ) {
              return true
            }
            if (indexMetadata.columns.length !== tableIndex.columnNames.length) {
              return true
            }
            return !indexMetadata.columns.every(
              (column: ColumnMetadata) => tableIndex.columnNames.indexOf(column.databaseName) !== -1
            )
          }
          return true
        })
        dropQueries.map(async (tableIndex: TableIndex) => {
          this.connection.logger.logSchemaBuild(
            `dropping an index: "${tableIndex.name}" from table ${table.name}`
          )
          await this.queryRunner.dropIndex(table, tableIndex)
        })

        await Promise.all(dropQueries)
      }
    }
  }

  private static insertQueryBuilderCreateValuesExpression = () => {
    InsertQueryBuilder.prototype['createValuesExpression'] = function () {
      const valueSets = this.getValueSets()
      const columns = this.getInsertedColumns()

      // if column metadatas are given then apply all necessary operations with values
      if (columns.length > 0) {
        let expression = ''
        valueSets.forEach((valueSet, valueSetIndex) => {
          columns.forEach((column, columnIndex) => {
            if (columnIndex === 0) {
              if (this.connection.driver.options.type === 'oracle' && valueSets.length > 1) {
                expression += ' SELECT '
              } else if (this.connection.driver.options.type === 'sap' && valueSets.length > 1) {
                expression += ' SELECT '
              } else {
                expression += '('
              }
            }
            let value = column.getEntityValue(valueSet)

            if (!(typeof value === 'function')) {
              value = this.connection.driver.preparePersistentValue(value, column)
            }

            // newly inserted entities always have a version equal to 1 (first version)
            // also, user-specified version must be empty
            if (column.isVersion && value === undefined) {
              expression += '1'
            } else if (column.isDiscriminator) {
              expression += this.createParameter(
                this.expressionMap.mainAlias?.metadata.discriminatorValue
              )
            } else if (
              column.isGenerated &&
              column.generationStrategy === 'uuid' &&
              !this.connection.driver.isUUIDGenerationSupported() &&
              value === undefined
            ) {
              value = uuidv4()
              expression += this.createParameter(value)

              if (!(valueSetIndex in this.expressionMap.locallyGenerated)) {
                this.expressionMap.locallyGenerated[valueSetIndex] = {}
              }
              column.setEntityValue(this.expressionMap.locallyGenerated[valueSetIndex], value)

              // if value for this column was not provided then insert default value
            } else if (value === undefined) {
              if (
                (this.connection.driver.options.type === 'oracle' && valueSets.length > 1) ||
                DriverUtils.isSQLiteFamily(this.connection.driver) ||
                this.connection.driver.options.type === 'sap' ||
                this.connection.driver.options.type === 'spanner'
              ) {
                // unfortunately sqlite does not support DEFAULT expression in INSERT queries
                if (column.default !== undefined && column.default !== null) {
                  // try to use default defined in the column
                  expression += this.connection.driver.normalizeDefault(column)
                } else {
                  expression += 'NULL' // otherwise simply use NULL and pray if column is nullable
                }
              } else {
                expression += 'DEFAULT'
              }
            } else if (value === null && this.connection.driver.options.type === 'spanner') {
              expression += 'NULL'

              // support for SQL expressions in queries
            } else if (typeof value === 'function') {
              expression += value()

              // just any other regular value
            } else {
              if (this.connection.driver.options.type === 'mssql') {
                value = (this.connection.driver as SqlServerDriver).parametrizeValue(column, value)
              }

              // we need to store array values in a special class to make sure parameter replacement will work correctly
              // if (value instanceof Array)
              //     value = new ArrayParameter(value);

              const paramName = this.createParameter(value)

              if (
                (DriverUtils.isMySQLFamily(this.connection.driver) ||
                  this.connection.driver.options.type === 'aurora-mysql') &&
                this.connection.driver.spatialTypes.indexOf(column.type) !== -1
              ) {
                const useLegacy = (this.connection.driver as MysqlDriver | AuroraMysqlDriver)
                  .options.legacySpatialSupport
                const geomFromText = useLegacy ? 'GeomFromText' : 'ST_GeomFromText'
                if (column.srid !== null) {
                  expression += `${geomFromText}(${paramName}, ${column.srid})`
                } else {
                  expression += `${geomFromText}(${paramName})`
                }
              } else if (
                DriverUtils.isPostgresFamily(this.connection.driver) &&
                this.connection.driver.spatialTypes.indexOf(column.type) !== -1
              ) {
                if (column.srid !== null) {
                  expression += `ST_SetSRID(ST_GeomFromGeoJSON(${paramName}), ${column.srid})::${column.type}`
                } else {
                  expression += `ST_GeomFromGeoJSON(${paramName})::${column.type}`
                }
                /** 达梦数据库扩展支持空间格式（start） */
              } else if (
                this.connection.driver.options.type === 'dm' &&
                this.connection.driver.spatialTypes.indexOf(column.type) !== -1
              ) {
                expression += (this.connection.driver as DmDriver).getGeometryExpression(
                  paramName,
                  column
                )
              } else if (
                /** end */
                this.connection.driver.options.type === 'mssql' &&
                this.connection.driver.spatialTypes.indexOf(column.type) !== -1
              ) {
                expression += `${column.type}::STGeomFromText(${paramName}, ${column.srid || '0'})`
              } else {
                expression += paramName
              }
            }

            if (columnIndex === columns.length - 1) {
              if (valueSetIndex === valueSets.length - 1) {
                if (this.connection.driver.options.type === 'oracle' && valueSets.length > 1) {
                  expression += ' FROM DUAL '
                } else if (this.connection.driver.options.type === 'sap' && valueSets.length > 1) {
                  expression += ' FROM dummy '
                } else {
                  expression += ')'
                }
              } else {
                if (this.connection.driver.options.type === 'oracle' && valueSets.length > 1) {
                  expression += ' FROM DUAL UNION ALL '
                } else if (this.connection.driver.options.type === 'sap' && valueSets.length > 1) {
                  expression += ' FROM dummy UNION ALL '
                } else {
                  expression += '), '
                }
              }
            } else {
              expression += ', '
            }
          })
        })
        if (expression === '()') {
          return ''
        }
        return expression
      } else {
        // for tables without metadata
        // get values needs to be inserted
        let expression = ''

        valueSets.forEach((valueSet, insertionIndex) => {
          const columns = Object.keys(valueSet)
          columns.forEach((columnName, columnIndex) => {
            if (columnIndex === 0) {
              expression += '('
            }

            const value = valueSet[columnName]

            // support for SQL expressions in queries
            if (typeof value === 'function') {
              expression += value()

              // if value for this column was not provided then insert default value
            } else if (value === undefined) {
              if (
                (this.connection.driver.options.type === 'oracle' && valueSets.length > 1) ||
                DriverUtils.isSQLiteFamily(this.connection.driver) ||
                this.connection.driver.options.type === 'sap' ||
                this.connection.driver.options.type === 'spanner'
              ) {
                expression += 'NULL'
              } else {
                expression += 'DEFAULT'
              }
            } else if (value === null && this.connection.driver.options.type === 'spanner') {
              // just any other regular value
            } else {
              expression += this.createParameter(value)
            }

            if (columnIndex === Object.keys(valueSet).length - 1) {
              if (insertionIndex === valueSets.length - 1) {
                expression += ')'
              } else {
                expression += '), '
              }
            } else {
              expression += ', '
            }
          })
        })
        if (expression === '()') {
          return ''
        }
        return expression
      }
    }
  }

  private static selectQueryBuilderBuildEscapedEntityColumnSelects = () => {
    SelectQueryBuilder.prototype['buildEscapedEntityColumnSelects'] = function (
      aliasName: string,
      metadata: EntityMetadata
    ): SelectQuery[] {
      const hasMainAlias = this.expressionMap.selects.some(select => select.selection === aliasName)

      const columns: ColumnMetadata[] = []
      if (hasMainAlias) {
        columns.push(...metadata.columns.filter(column => column.isSelect === true))
      }
      columns.push(
        ...metadata.columns.filter(column => {
          return this.expressionMap.selects.some(
            select => select.selection === `${aliasName}.${column.propertyPath}`
          )
        })
      )

      // if user used partial selection and did not select some primary columns which are required to be selected
      // we select those primary columns and mark them as "virtual". Later virtual column values will be removed from final entity
      // to make entity contain exactly what user selected
      if (columns.length === 0) {
        // however not in the case when nothing (even partial) was selected from this target (for example joins without selection)
        return []
      }

      const nonSelectedPrimaryColumns = this.expressionMap.queryEntity
        ? metadata.primaryColumns.filter(primaryColumn => columns.indexOf(primaryColumn) === -1)
        : []
      const allColumns = [...columns, ...nonSelectedPrimaryColumns]
      const finalSelects: SelectQuery[] = []

      const escapedAliasName = this.escape(aliasName)
      allColumns.forEach(column => {
        let selectionPath = `${escapedAliasName}.${this.escape(column.databaseName)}`

        if (column['isVirtualProperty'] && column['query']) {
          selectionPath = `(${column['query'](escapedAliasName)})`
        }

        if (this.connection.driver.spatialTypes.indexOf(column.type) !== -1) {
          if (
            DriverUtils.isMySQLFamily(this.connection.driver) ||
            this.connection.driver.options.type === 'aurora-mysql'
          ) {
            const useLegacy = (this.connection.driver as MysqlDriver | AuroraMysqlDriver).options
              .legacySpatialSupport
            const asText = useLegacy ? 'AsText' : 'ST_AsText'
            selectionPath = `${asText}(${selectionPath})`
          }

          if (DriverUtils.isPostgresFamily(this.connection.driver)) {
            if (column.precision) {
              // cast to JSON to trigger parsing in the driver
              selectionPath = `ST_AsGeoJSON(${selectionPath}, ${column.precision})::json`
            } else {
              selectionPath = `ST_AsGeoJSON(${selectionPath})::json`
            }
          }
          /** 达梦数据库扩展将clob 格式的空间数据转长文本输出（start） */
          if (this.connection.driver.options.type === 'dm') {
            selectionPath = `dmgeo.st_astext(${selectionPath})`
          }
          /** end */
          if (this.connection.driver.options.type === 'mssql') {
            selectionPath = `${selectionPath}.ToString()`
          }
        }

        const selections = this.expressionMap.selects.filter(
          select => select.selection === `${aliasName}.${column.propertyPath}`
        )
        if (selections.length) {
          selections.forEach(selection => {
            finalSelects.push({
              selection: selectionPath,
              aliasName: selection.aliasName
                ? selection.aliasName
                : DriverUtils.buildAlias(
                    this.connection.driver,
                    undefined,
                    aliasName,
                    column.databaseName
                  ),
              // todo: need to keep in mind that custom selection.aliasName breaks hydrator. fix it later!
              virtual: selection.virtual
            })
          })
        } else {
          finalSelects.push({
            selection: selectionPath,
            aliasName: DriverUtils.buildAlias(
              this.connection.driver,
              undefined,
              aliasName,
              column.databaseName
            ),
            // todo: need to keep in mind that custom selection.aliasName breaks hydrator. fix it later!
            virtual: hasMainAlias
          })
        }
      })
      return finalSelects
    }
  }

  static build() {
    Restructure.driverFactoryCreate()
    Restructure.rdbmsSchemaBuilderDropOldIndices()
    Restructure.insertQueryBuilderCreateValuesExpression()
    Restructure.selectQueryBuilderBuildEscapedEntityColumnSelects()
  }
}
