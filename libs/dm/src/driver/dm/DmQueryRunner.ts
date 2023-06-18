import {
  ColumnType,
  InstanceChecker,
  ObjectLiteral,
  QueryRunner,
  ReplicationMode,
  Table,
  TableCheck,
  TableColumn,
  TableForeignKey,
  TableIndex,
  TableUnique,
  TypeORMError
} from 'typeorm'
import { DmDriver } from './DmDriver'
import { OracleQueryRunner } from 'typeorm/driver/oracle/OracleQueryRunner'
import { View } from 'typeorm/schema-builder/view/View'
import { Query } from 'typeorm/driver/Query'
import { OrmUtils } from 'typeorm/util/OrmUtils'
import { MetadataTableType } from 'typeorm/driver/types/MetadataTableType'
import { DmConnectionOptions, NoSafe } from './DmConnectionOptions'
/**
 * Runs queries on a single oracle database connection.
 */
export class DmQueryRunner extends OracleQueryRunner implements QueryRunner {
  constructor(driver: DmDriver, mode: ReplicationMode) {
    super(driver as NoSafe, mode)
  }

  /**
   * 特殊处理达梦约束执行语句
   * 由于达梦在 删除不存在的约束或添加已存在的主键会异常
   * 故在执行上述2步骤时，需先进行是否存在的判断
   *
   * @param query sql
   */
  protected async specailConstraintQuery(query: string) {
    let isContinue = false
    try {
      const isDrop = query.indexOf('DROP CONSTRAINT') > -1
      const isAdd = query.indexOf('ADD CONSTRAINT') > -1
      if (isDrop || isAdd) {
        const querys = query.split(' ')
        const schemaAndTable = querys[2]?.replace("'", '')?.split('.')
        const key = querys[5]
        if (schemaAndTable?.length === 2 && key) {
          const res = await this.query(
            `select COUNT(0) as count from user_constraints where owner=${schemaAndTable[0]} AND TABLE_NAME=${schemaAndTable[1]} AND CONSTRAINT_NAME=${key}`
              .split('"')
              .join("'")
          )
          if (res?.[0]?.COUNT === BigInt(0) && isDrop) {
            isContinue = true
          }
          if (res?.[0]?.COUNT === BigInt(1) && isAdd) {
            isContinue = true
          }
        }
      }
    } catch (error) {
      //TODO 当异常的时候做一些事
      console.log('操作约束：', error)
    }
    return isContinue
  }

  /**
   * 特殊处理达梦多条执行语句
   * 由于达梦不支持多条语句执行，所以需根据；分步在执行
   *
   * @param query sql
   */
  protected async specailMoreQuery(query: string, parameters: NoSafe[]) {
    let isContinue = false
    try {
      if (query.indexOf('&&&&') > -1) {
        const querys = query.split('&&&&')
        for (const qy of querys) {
          await this.query(qy, parameters)
        }
        isContinue = true
      }
    } catch (error) {
      //TODO 当异常的时候做一些事
      console.log('多语句：', error)
    }
    return isContinue
  }

  /**
   * 该方法时执行一些DLL语句
   *
   * @param upQueries
   * @param downQueries
   * @returns
   */
  protected async executeQueries(
    upQueries: Query | Query[],
    downQueries: Query | Query[]
  ): Promise<void> {
    if (InstanceChecker.isQuery(upQueries)) {
      upQueries = [upQueries]
    }
    if (InstanceChecker.isQuery(downQueries)) {
      downQueries = [downQueries]
    }
    this.sqlInMemory.upQueries.push(...upQueries)
    this.sqlInMemory.downQueries.push(...downQueries)
    if (this.sqlMemoryMode === true) {
      return Promise.resolve() as Promise<NoSafe>
    }
    for (const { query, parameters } of upQueries) {
      /**达梦数据库特殊处理（start） */
      const constraint = await this.specailConstraintQuery(query)
      if (constraint) {
        continue
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const more = await this.specailMoreQuery(query, parameters as any[])
      if (more) {
        continue
      }
      /** end */
      await this.query(query, parameters)
    }
  }

  async query(query: string, parameters?: NoSafe[], useStructuredResult = false): Promise<NoSafe> {
    if (query.indexOf('false') > -1) {
      query = query.replace(/false/g, '0')
    }
    if (query.indexOf('true') > -1) {
      query = query.replace(/true/g, '1')
    }
    return super.query(query, parameters, useStructuredResult)
  }

  /**
   * 该方法拼接一个dll 数据结构生成语句
   */
  protected buildCreateColumnSql(column: TableColumn) {
    let c = `"${column.name}" ${this.connection.driver.createFullType(column)}`
    if (column.charset) {
      c += ` CHARACTER SET ${column.charset}`
    }
    if (column.collation) {
      c += ` COLLATE ${column.collation}`
    }
    if (column.asExpression) {
      c += ` AS (${column.asExpression}) VIRTUAL`
    }
    if (column.default !== undefined && column.default !== null) {
      c += ` DEFAULT ${column.default}`
    }
    if (column.isNullable !== true && !column.isGenerated) {
      c += ' NOT NULL'
    }
    /** 达梦数据库特殊处理（start） */
    if (column.isGenerated === true && column.generationStrategy === 'increment') {
      c += ' IDENTITY(1,1) NOT NULL'
    }
    /** end */
    return c
  }

  /**
   * 重写完整表格查询函数
   * 达梦数据库以`"${模式名}"."${表名}"`
   *
   * @param target
   * @returns
   */
  protected escapePath(target: Table | View | string): string {
    const { schema, tableName } = this.driver.parseTableName(target)
    return `"${schema}"."${tableName}"`
  }

  /**
   * 重写删除索引sql语句
   * 由于达梦支持IF EXISTS
   * 所以添加是否存在判断
   */
  protected dropIndexSql(indexOrName: TableIndex | string): Query {
    const indexName = InstanceChecker.isTableIndex(indexOrName) ? indexOrName.name : indexOrName
    return new Query(`DROP INDEX IF EXISTS ${this.driver.schema}."${indexName}"`)
  }

  /**
   * Builds create index sql.
   */
  protected createIndexSql(table: Table, index: TableIndex): Query {
    const columns = index.columnNames.map(columnName => `"${columnName}"`).join(', ')
    return new Query(
      `CREATE ${index.isSpatial ? 'SPATIAL' : ''} ${index.isUnique ? 'UNIQUE ' : ''}INDEX "${
        index.name
      }" ON ${this.escapePath(table)} (${columns})`
    )
  }

  /**
   * 添加新列到该表中
   * 达梦扩展（支持注释的添加）
   *
   * @param tableOrName
   * @param column
   */
  async addColumn(tableOrName: Table | string, column: TableColumn): Promise<void> {
    const table = InstanceChecker.isTable(tableOrName)
      ? tableOrName
      : await this.getCachedTable(tableOrName)
    const clonedTable = table.clone()
    const upQueries: Query[] = []
    const downQueries: Query[] = []

    upQueries.push(
      new Query(`ALTER TABLE ${this.escapePath(table)} ADD ${this.buildCreateColumnSql(column)}`)
    )
    downQueries.push(
      new Query(`ALTER TABLE ${this.escapePath(table)} DROP COLUMN "${column.name}"`)
    )

    // create or update primary key constraint
    if (column.isPrimary) {
      const primaryColumns = clonedTable.primaryColumns
      // if table already have primary key, me must drop it and recreate again
      if (primaryColumns.length > 0) {
        const pkName = primaryColumns[0]?.['primaryKeyConstraintName']
          ? primaryColumns[0]?.['primaryKeyConstraintName']
          : this.connection.namingStrategy.primaryKeyName(
              clonedTable,
              primaryColumns.map(column => column.name)
            )

        const columnNames = primaryColumns.map(column => `"${column.name}"`).join(', ')

        upQueries.push(
          new Query(`ALTER TABLE ${this.escapePath(table)} DROP CONSTRAINT "${pkName}"`)
        )
        downQueries.push(
          new Query(
            `ALTER TABLE ${this.escapePath(
              table
            )} ADD CONSTRAINT "${pkName}" PRIMARY KEY (${columnNames})`
          )
        )
      }

      primaryColumns.push(column)
      const pkName = primaryColumns[0]?.['primaryKeyConstraintName']
        ? primaryColumns[0]?.['primaryKeyConstraintName']
        : this.connection.namingStrategy.primaryKeyName(
            clonedTable,
            primaryColumns.map(column => column.name)
          )

      const columnNames = primaryColumns.map(column => `"${column.name}"`).join(', ')

      upQueries.push(
        new Query(
          `ALTER TABLE ${this.escapePath(
            table
          )} ADD CONSTRAINT "${pkName}" PRIMARY KEY (${columnNames})`
        )
      )
      downQueries.push(
        new Query(`ALTER TABLE ${this.escapePath(table)} DROP CONSTRAINT "${pkName}"`)
      )
    }

    // create column index
    const columnIndex = clonedTable.indices.find(
      index => index.columnNames.length === 1 && index.columnNames[0] === column.name
    )
    if (columnIndex) {
      clonedTable.indices.splice(clonedTable.indices.indexOf(columnIndex), 1)
      upQueries.push(this.createIndexSql(table, columnIndex))
      downQueries.push(this.dropIndexSql(columnIndex))
    }

    // create unique constraint
    if (column.isUnique) {
      const uniqueConstraint = new TableUnique({
        name: this.connection.namingStrategy.uniqueConstraintName(table, [column.name]),
        columnNames: [column.name]
      })
      clonedTable.uniques.push(uniqueConstraint)
      upQueries.push(
        new Query(
          `ALTER TABLE ${this.escapePath(table)} ADD CONSTRAINT "${
            uniqueConstraint.name
          }" UNIQUE ("${column.name}")`
        )
      )
      downQueries.push(
        new Query(
          `ALTER TABLE ${this.escapePath(table)} DROP CONSTRAINT "${uniqueConstraint.name}"`
        )
      )
    }

    if (column.generatedType && column.asExpression) {
      const insertQuery = this.insertTypeormMetadataSql({
        table: table.name,
        type: MetadataTableType.GENERATED_COLUMN,
        name: column.name,
        value: column.asExpression
      })

      const deleteQuery = this.deleteTypeormMetadataSql({
        table: table.name,
        type: MetadataTableType.GENERATED_COLUMN,
        name: column.name
      })

      upQueries.push(insertQuery)
      downQueries.push(deleteQuery)
    }

    /**达梦扩展（支持注释的添加）（start） */
    if (column.comment) {
      upQueries.push(
        new Query(
          `COMMENT ON COLUMN ${this.escapePath(table)}."${column.name}" IS ${this.escapeComment(
            column.comment
          )}`
        )
      )
      downQueries.push(
        new Query(
          `COMMENT ON COLUMN ${this.escapePath(table)}."${column.name}" IS ${this.escapeComment(
            column.comment
          )}`
        )
      )
    }
    /** end */

    await this.executeQueries(upQueries, downQueries)

    clonedTable.addColumn(column)
    this.replaceCachedTable(table, clonedTable)
  }

  /**
   * 创建新的外键
   * 达梦数据库（异步改同步）
   *
   * @param tableOrName
   * @param foreignKeys
   */
  async createForeignKeys(
    tableOrName: Table | string,
    foreignKeys: TableForeignKey[]
  ): Promise<void> {
    for (const foreignKey of foreignKeys) {
      await this.createForeignKey(tableOrName, foreignKey)
    }
  }

  /**
   * 删除约束
   * 达梦数据库（异步改同步）
   *
   * @param tableOrName
   * @param checkConstraints
   */
  async dropCheckConstraints(
    tableOrName: Table | string,
    checkConstraints: TableCheck[]
  ): Promise<void> {
    for (const checkConstraint of checkConstraints) {
      await this.dropCheckConstraint(tableOrName, checkConstraint)
    }
  }

  /**
   * 删除外键
   * 达梦数据库（异步改同步）
   *
   * @param tableOrName
   * @param foreignKeys
   */
  async dropForeignKeys(
    tableOrName: Table | string,
    foreignKeys: TableForeignKey[]
  ): Promise<void> {
    for (const foreignKey of foreignKeys) {
      await this.dropForeignKey(tableOrName, foreignKey)
    }
  }

  /**
   * 创建索引
   * 达梦数据库（异步改同步）
   *
   * @param tableOrName
   * @param indices
   */
  async createIndices(tableOrName: Table | string, indices: TableIndex[]): Promise<void> {
    for (const index of indices) {
      await this.createIndex(tableOrName, index)
    }
  }

  /**
   * 删除索引
   * 达梦数据库（异步改同步）
   *
   * @param tableOrName
   * @param indices
   */
  async dropIndices(tableOrName: Table | string, indices: TableIndex[]): Promise<void> {
    for (const index of indices) {
      await this.dropIndex(tableOrName, index)
    }
  }

  /**
   * 修改已存在的列
   * 达梦扩展（支持注释的修改）
   *
   * @param tableOrName
   * @param oldTableColumnOrName
   * @param newColumn
   */
  async changeColumn(
    tableOrName: Table | string,
    oldTableColumnOrName: TableColumn | string,
    newColumn: TableColumn
  ): Promise<void> {
    const table = InstanceChecker.isTable(tableOrName)
      ? tableOrName
      : await this.getCachedTable(tableOrName)
    let clonedTable = table.clone()
    const upQueries: Query[] = []
    const downQueries: Query[] = []

    const oldColumn = InstanceChecker.isTableColumn(oldTableColumnOrName)
      ? oldTableColumnOrName
      : table.columns.find(column => column.name === oldTableColumnOrName)
    if (!oldColumn) {
      throw new TypeORMError(
        `Column "${oldTableColumnOrName}" was not found in the ${this.escapePath(table)} table.`
      )
    }
    if (
      (newColumn.isGenerated !== oldColumn.isGenerated &&
        newColumn.generationStrategy !== 'uuid') ||
      oldColumn.type !== newColumn.type ||
      oldColumn.length !== newColumn.length ||
      oldColumn.generatedType !== newColumn.generatedType ||
      oldColumn.asExpression !== newColumn.asExpression
    ) {
      // Oracle does not support changing of IDENTITY column, so we must drop column and recreate it again.
      // Also, we recreate column if column type changed
      await this.dropColumn(table, oldColumn)
      await this.addColumn(table, newColumn)

      // update cloned table
      clonedTable = table.clone()
    } else {
      if (newColumn.name !== oldColumn.name) {
        // rename column
        upQueries.push(
          new Query(
            `ALTER TABLE ${this.escapePath(table)} RENAME COLUMN "${oldColumn.name}" TO "${
              newColumn.name
            }"`
          )
        )
        downQueries.push(
          new Query(
            `ALTER TABLE ${this.escapePath(table)} RENAME COLUMN "${newColumn.name}" TO "${
              oldColumn.name
            }"`
          )
        )

        // rename column primary key constraint
        if (oldColumn.isPrimary === true && !oldColumn?.['primaryKeyConstraintName']) {
          const primaryColumns = clonedTable.primaryColumns

          // build old primary constraint name
          const columnNames = primaryColumns.map(column => column.name)
          const oldPkName = this.connection.namingStrategy.primaryKeyName(clonedTable, columnNames)

          // replace old column name with new column name
          columnNames.splice(columnNames.indexOf(oldColumn.name), 1)
          columnNames.push(newColumn.name)

          // build new primary constraint name
          const newPkName = this.connection.namingStrategy.primaryKeyName(clonedTable, columnNames)

          upQueries.push(
            new Query(
              `ALTER TABLE ${this.escapePath(
                table
              )} RENAME CONSTRAINT "${oldPkName}" TO "${newPkName}"`
            )
          )
          downQueries.push(
            new Query(
              `ALTER TABLE ${this.escapePath(
                table
              )} RENAME CONSTRAINT "${newPkName}" TO "${oldPkName}"`
            )
          )
        }

        // rename unique constraints
        clonedTable.findColumnUniques(oldColumn).forEach(unique => {
          const oldUniqueName = this.connection.namingStrategy.uniqueConstraintName(
            clonedTable,
            unique.columnNames
          )

          // Skip renaming if Unique has user defined constraint name
          if (unique.name !== oldUniqueName) {
            return
          }

          // build new constraint name
          unique.columnNames.splice(unique.columnNames.indexOf(oldColumn.name), 1)
          unique.columnNames.push(newColumn.name)
          const newUniqueName = this.connection.namingStrategy.uniqueConstraintName(
            clonedTable,
            unique.columnNames
          )

          // build queries
          upQueries.push(
            new Query(
              `ALTER TABLE ${this.escapePath(table)} RENAME CONSTRAINT "${
                unique.name
              }" TO "${newUniqueName}"`
            )
          )
          downQueries.push(
            new Query(
              `ALTER TABLE ${this.escapePath(table)} RENAME CONSTRAINT "${newUniqueName}" TO "${
                unique.name
              }"`
            )
          )

          // replace constraint name
          unique.name = newUniqueName
        })

        // rename index constraints
        clonedTable.findColumnIndices(oldColumn).forEach(index => {
          const oldIndexName = this.connection.namingStrategy.indexName(
            clonedTable,
            index.columnNames,
            index.where
          )

          // Skip renaming if Index has user defined constraint name
          if (index.name !== oldIndexName) {
            return
          }

          // build new constraint name
          index.columnNames.splice(index.columnNames.indexOf(oldColumn.name), 1)
          index.columnNames.push(newColumn.name)
          const newIndexName = this.connection.namingStrategy.indexName(
            clonedTable,
            index.columnNames,
            index.where
          )

          // build queries
          upQueries.push(new Query(`ALTER INDEX "${index.name}" RENAME TO "${newIndexName}"`))
          downQueries.push(new Query(`ALTER INDEX "${newIndexName}" RENAME TO "${index.name}"`))

          // replace constraint name
          index.name = newIndexName
        })

        // rename foreign key constraints
        clonedTable.findColumnForeignKeys(oldColumn).forEach(foreignKey => {
          const foreignKeyName = this.connection.namingStrategy.foreignKeyName(
            clonedTable,
            foreignKey.columnNames,
            this.getTablePath(foreignKey),
            foreignKey.referencedColumnNames
          )

          // Skip renaming if foreign key has user defined constraint name
          if (foreignKey.name !== foreignKeyName) {
            return
          }

          // build new constraint name
          foreignKey.columnNames.splice(foreignKey.columnNames.indexOf(oldColumn.name), 1)
          foreignKey.columnNames.push(newColumn.name)
          const newForeignKeyName = this.connection.namingStrategy.foreignKeyName(
            clonedTable,
            foreignKey.columnNames,
            this.getTablePath(foreignKey),
            foreignKey.referencedColumnNames
          )

          // build queries
          upQueries.push(
            new Query(
              `ALTER TABLE ${this.escapePath(table)} RENAME CONSTRAINT "${
                foreignKey.name
              }" TO "${newForeignKeyName}"`
            )
          )
          downQueries.push(
            new Query(
              `ALTER TABLE ${this.escapePath(table)} RENAME CONSTRAINT "${newForeignKeyName}" TO "${
                foreignKey.name
              }"`
            )
          )

          // replace constraint name
          foreignKey.name = newForeignKeyName
        })

        // rename old column in the Table object
        const oldTableColumn = clonedTable.columns.find(column => column.name === oldColumn.name)
        clonedTable.columns[clonedTable.columns.indexOf(oldTableColumn as TableColumn)].name =
          newColumn.name
        oldColumn.name = newColumn.name
      }

      if (this.isColumnChanged(oldColumn, newColumn, true, true)) {
        let defaultUp = ''
        let defaultDown = ''
        let nullableUp = ''
        let nullableDown = ''

        // changing column default
        if (newColumn.default !== null && newColumn.default !== undefined) {
          defaultUp = `DEFAULT ${newColumn.default}`

          if (oldColumn.default !== null && oldColumn.default !== undefined) {
            defaultDown = `DEFAULT ${oldColumn.default}`
          } else {
            defaultDown = 'DEFAULT NULL'
          }
        } else if (oldColumn.default !== null && oldColumn.default !== undefined) {
          defaultUp = 'DEFAULT NULL'
          defaultDown = `DEFAULT ${oldColumn.default}`
        }

        // changing column isNullable property
        if (newColumn.isNullable !== oldColumn.isNullable) {
          if (newColumn.isNullable === true) {
            nullableUp = 'NULL'
            nullableDown = 'NOT NULL'
          } else {
            nullableUp = 'NOT NULL'
            nullableDown = 'NULL'
          }
        }
        /** 达梦扩展支持注释说明的修改（start） */
        if (oldColumn.comment !== newColumn.comment) {
          upQueries.push(
            new Query(
              `COMMENT ON COLUMN ${this.escapePath(table)}."${oldColumn.name}" IS ${
                this.escapeComment(newColumn.comment) || "''"
              }`
            )
          )
          downQueries.push(
            new Query(
              `COMMENT ON COLUMN ${this.escapePath(table)}."${newColumn.name}" IS ${
                this.escapeComment(oldColumn.comment) || "''"
              }`
            )
          )
        }
        /** end */

        upQueries.push(
          new Query(
            `ALTER TABLE ${this.escapePath(table)} MODIFY "${
              oldColumn.name
            }" ${this.connection.driver.createFullType(newColumn)} ${defaultUp} ${nullableUp}`
          )
        )
        downQueries.push(
          new Query(
            `ALTER TABLE ${this.escapePath(table)} MODIFY "${
              oldColumn.name
            }" ${this.connection.driver.createFullType(oldColumn)} ${defaultDown} ${nullableDown}`
          )
        )
      }

      if (newColumn.isPrimary !== oldColumn.isPrimary) {
        const primaryColumns = clonedTable.primaryColumns

        // if primary column state changed, we must always drop existed constraint.
        if (primaryColumns.length > 0) {
          const pkName = primaryColumns[0]?.['primaryKeyConstraintName']
            ? primaryColumns[0]?.['primaryKeyConstraintName']
            : this.connection.namingStrategy.primaryKeyName(
                clonedTable,
                primaryColumns.map(column => column.name)
              )

          const columnNames = primaryColumns.map(column => `"${column.name}"`).join(', ')

          upQueries.push(
            new Query(`ALTER TABLE ${this.escapePath(table)} DROP CONSTRAINT "${pkName}"`)
          )
          downQueries.push(
            new Query(
              `ALTER TABLE ${this.escapePath(
                table
              )} ADD CONSTRAINT "${pkName}" PRIMARY KEY (${columnNames})`
            )
          )
        }

        if (newColumn.isPrimary === true) {
          primaryColumns.push(newColumn)
          // update column in table
          const column = clonedTable.columns.find(column => column.name === newColumn.name)
          if (column) {
            column.isPrimary = true
          }
          const pkName = primaryColumns[0]?.['primaryKeyConstraintName']
            ? primaryColumns[0]?.['primaryKeyConstraintName']
            : this.connection.namingStrategy.primaryKeyName(
                clonedTable,
                primaryColumns.map(column => column.name)
              )

          const columnNames = primaryColumns.map(column => `"${column.name}"`).join(', ')

          upQueries.push(
            new Query(
              `ALTER TABLE ${this.escapePath(
                table
              )} ADD CONSTRAINT "${pkName}" PRIMARY KEY (${columnNames})`
            )
          )
          downQueries.push(
            new Query(`ALTER TABLE ${this.escapePath(table)} DROP CONSTRAINT "${pkName}"`)
          )
        } else {
          const primaryColumn = primaryColumns.find(c => c.name === newColumn.name)
          primaryColumns.splice(primaryColumns.indexOf(primaryColumn as TableColumn), 1)

          // update column in table
          const column = clonedTable.columns.find(column => column.name === newColumn.name)
          if (column) {
            column.isPrimary = false
          }

          // if we have another primary keys, we must recreate constraint.
          if (primaryColumns.length > 0) {
            const pkName = primaryColumns[0]?.['primaryKeyConstraintName']
              ? primaryColumns[0]?.['primaryKeyConstraintName']
              : this.connection.namingStrategy.primaryKeyName(
                  clonedTable,
                  primaryColumns.map(column => column.name)
                )

            const columnNames = primaryColumns.map(column => `"${column.name}"`).join(', ')

            upQueries.push(
              new Query(
                `ALTER TABLE ${this.escapePath(
                  table
                )} ADD CONSTRAINT "${pkName}" PRIMARY KEY (${columnNames})`
              )
            )
            downQueries.push(
              new Query(`ALTER TABLE ${this.escapePath(table)} DROP CONSTRAINT "${pkName}"`)
            )
          }
        }
      }

      if (newColumn.isUnique !== oldColumn.isUnique) {
        if (newColumn.isUnique === true) {
          const uniqueConstraint = new TableUnique({
            name: this.connection.namingStrategy.uniqueConstraintName(table, [newColumn.name]),
            columnNames: [newColumn.name]
          })
          clonedTable.uniques.push(uniqueConstraint)
          upQueries.push(
            new Query(
              `ALTER TABLE ${this.escapePath(table)} ADD CONSTRAINT "${
                uniqueConstraint.name
              }" UNIQUE ("${newColumn.name}")`
            )
          )
          downQueries.push(
            new Query(
              `ALTER TABLE ${this.escapePath(table)} DROP CONSTRAINT "${uniqueConstraint.name}"`
            )
          )
        } else {
          const uniqueConstraint = clonedTable.uniques.find(unique => {
            return (
              unique.columnNames.length === 1 &&
              !!unique.columnNames.find(columnName => columnName === newColumn.name)
            )
          })
          clonedTable.uniques.splice(
            clonedTable.uniques.indexOf(uniqueConstraint as TableUnique),
            1
          )
          upQueries.push(
            new Query(
              `ALTER TABLE ${this.escapePath(table)} DROP CONSTRAINT "${uniqueConstraint?.name}"`
            )
          )
          downQueries.push(
            new Query(
              `ALTER TABLE ${this.escapePath(table)} ADD CONSTRAINT "${
                uniqueConstraint?.name
              }" UNIQUE ("${newColumn.name}")`
            )
          )
        }
      }

      await this.executeQueries(upQueries, downQueries)
      this.replaceCachedTable(table, clonedTable)
    }
  }

  protected isDefaultColumnLength(table: Table, column: TableColumn, length: string): boolean {
    // if table have metadata, we check if length is specified in column metadata
    if (this.connection.hasMetadata(table.name)) {
      const metadata = this.connection.getMetadata(table.name)
      const columnMetadata = metadata.findColumnWithDatabaseName(column.name)
      if (columnMetadata) {
        const columnMetadataLength = this.connection.driver.getColumnLength(columnMetadata)
        if (columnMetadataLength) {
          return false
        }
      }
    }

    if (
      this.connection.driver.dataTypeDefaults &&
      this.connection.driver.dataTypeDefaults[column.type] &&
      this.connection.driver.dataTypeDefaults[column.type].length
    ) {
      /** 达梦特殊处理（改为返回不相等）（start） */
      return (
        this.connection.driver.dataTypeDefaults[column.type]?.length?.toString() ===
        length.toString()
      )
      //TODO 此处可以继续研究，
      // 为啥默认逻辑在修改表名后会字段长度不一致导致更新当前列导致该列数据丢失
      /** end */
    }
    return false
  }

  /**
   * 生成创建新表的sql
   * 达梦扩展
   * 1、支持级联更新和删除
   * 2、支持注解的添加
   *
   * @param table
   * @param createForeignKeys
   * @returns
   */
  protected createTableSql(table: Table, createForeignKeys?: boolean): Query {
    const columnDefinitions = table.columns
      .map(column => this.buildCreateColumnSql(column))
      .join(', ')
    let sql = `CREATE TABLE ${this.escapePath(table)} (${columnDefinitions}`

    table.columns
      .filter(column => column.isUnique)
      .forEach(column => {
        const isUniqueExist = table.uniques.some(
          unique => unique.columnNames.length === 1 && unique.columnNames[0] === column.name
        )
        if (!isUniqueExist) {
          table.uniques.push(
            new TableUnique({
              name: this.connection.namingStrategy.uniqueConstraintName(table, [column.name]),
              columnNames: [column.name]
            })
          )
        }
      })

    if (table.uniques.length > 0) {
      const uniquesSql = table.uniques
        .map(unique => {
          const uniqueName = unique.name
            ? unique.name
            : this.connection.namingStrategy.uniqueConstraintName(table, unique.columnNames)
          const columnNames = unique.columnNames.map(columnName => `"${columnName}"`).join(', ')
          let constraint = `CONSTRAINT "${uniqueName}" UNIQUE (${columnNames})`
          if (unique.deferrable) {
            constraint += ` DEFERRABLE ${unique.deferrable}`
          }
          return constraint
        })
        .join(', ')

      sql += `, ${uniquesSql}`
    }

    if (table.checks.length > 0) {
      const checksSql = table.checks
        .map(check => {
          const checkName = check.name
            ? check.name
            : this.connection.namingStrategy.checkConstraintName(table, check?.expression as string)
          return `CONSTRAINT "${checkName}" CHECK (${check.expression})`
        })
        .join(', ')

      sql += `, ${checksSql}`
    }

    if (table.foreignKeys.length > 0 && createForeignKeys) {
      const foreignKeysSql = table.foreignKeys
        .map(fk => {
          const columnNames = fk.columnNames.map(columnName => `"${columnName}"`).join(', ')
          if (!fk.name) {
            fk.name = this.connection.namingStrategy.foreignKeyName(
              table,
              fk.columnNames,
              this.getTablePath(fk),
              fk.referencedColumnNames
            )
          }

          const referencedColumnNames = fk.referencedColumnNames
            .map(columnName => `"${columnName}"`)
            .join(', ')

          let constraint = `CONSTRAINT "${
            fk.name
          }" FOREIGN KEY (${columnNames}) REFERENCES ${this.escapePath(
            this.getTablePath(fk)
          )} (${referencedColumnNames})`
          /** 达梦数据库扩展 （start） */
          if (fk.onDelete) {
            constraint += ` ON DELETE ${fk.onDelete}`
          }
          if (fk.onUpdate) {
            constraint += ` ON UPDATE ${fk.onUpdate}`
          }
          /** end */
          return constraint
        })
        .join(', ')

      sql += `, ${foreignKeysSql}`
    }

    const primaryColumns = table.columns.filter(column => column.isPrimary)
    if (primaryColumns.length > 0) {
      const primaryKeyName = primaryColumns[0]?.['primaryKeyConstraintName']
        ? primaryColumns[0]?.['primaryKeyConstraintName']
        : this.connection.namingStrategy.primaryKeyName(
            table,
            primaryColumns.map(column => column.name)
          )

      const columnNames = primaryColumns.map(column => `"${column.name}"`).join(', ')
      sql += `, CONSTRAINT "${primaryKeyName}" PRIMARY KEY (${columnNames})`
    }

    sql += `)`

    /** 达梦数据库扩展（start） */
    table.columns
      .filter(it => it.comment)
      .forEach(
        it =>
          (sql += `&&&& COMMENT ON COLUMN ${this.escapePath(table)}."${
            it.name
          }" IS ${this.escapeComment(it.comment)}`)
      )
    /** end */

    return new Query(sql)
  }

  /**
   * 格式化注解
   *
   * @param comment
   * @returns
   */
  protected escapeComment(comment?: string) {
    if (!comment || comment.length === 0) {
      return ''
    }

    // eslint-disable-next-line no-control-regex
    comment = comment.replace(/'/g, "''").replace(/\u0000/g, '') // Null bytes aren't allowed in comments

    return `'${comment}'`
  }

  protected async processDmGeo() {
    try {
      const data = await this.query(`SELECT SF_CHECK_GEO_SYS`)
      const isOpen = data?.[0]?.SF_CHECK_GEO_SYS === 1
      const dmgeo = !!(this.driver.options as unknown as DmConnectionOptions)?.dmgeo
      if (dmgeo && !isOpen) {
        await this.query(`SP_INIT_GEO_SYS(1)`)
      }

      if (!dmgeo && isOpen) {
        await this.query(`SP_INIT_GEO_SYS(0)`)
      }
    } catch (error) {
      //TODO 是否需要关闭
    }
  }

  /**
   * 加载数据库原有各个表的列属性，约束，索引，外键等属性
   * 达梦修改和扩展了相关查询语句
   *
   * @param tableNames
   * @returns
   */
  protected async loadTables(tableNames?: string[]): Promise<Table[]> {
    /** 此处判断达梦空间数据是否开启 */
    await this.processDmGeo()

    if (tableNames && tableNames.length === 0) {
      return []
    }

    const dbTables: { TABLE_NAME: string; OWNER: string }[] = []

    const currentSchema = await this.getCurrentSchema()
    const currentDatabase = await this.getCurrentDatabase()

    if (!tableNames) {
      const tablesSql = `SELECT "TABLE_NAME", "OWNER" FROM "ALL_TABLES"`
      dbTables.push(...(await this.query(tablesSql)))
    } else {
      const tablesCondition = tableNames
        .map(tableName => {
          const parts = tableName.split('.')

          if (parts.length >= 3) {
            const [, schema, name] = parts
            return `("OWNER" = '${schema}' AND "TABLE_NAME" = '${name}')`
          } else if (parts.length === 2) {
            const [schema, name] = parts
            return `("OWNER" = '${schema}' AND "TABLE_NAME" = '${name}')`
          } else if (parts.length === 1) {
            const [name] = parts
            return `("TABLE_NAME" = '${name}')`
          } else {
            return `(1=0)`
          }
        })
        .join(' OR ')
      const tablesSql = `SELECT "TABLE_NAME", "OWNER" FROM "ALL_TABLES" WHERE ${tablesCondition}`
      dbTables.push(...(await this.query(tablesSql)))
    }

    // if tables were not found in the db, no need to proceed
    if (dbTables.length === 0) {
      return []
    }

    // load tables, columns, indices and foreign keys
    const columnsCondition = dbTables
      .map(({ TABLE_NAME, OWNER }) => {
        return `("C"."OWNER" = '${OWNER}' AND "C"."TABLE_NAME" = '${TABLE_NAME}')`
      })
      .join(' OR ')

    /** 达梦扩展自增列的关联查询条件（start） */
    const identityCondition = dbTables
      .map(({ TABLE_NAME, OWNER }) => {
        return `(owner = '${OWNER}' AND OBJECT_NAME = '${TABLE_NAME}')`
      })
      .join(' OR ')

    /** 扩展查询自增列 */
    const identity =
      `select a.NAME,c.OBJECT_NAME,decode(a.info2,1,'YES','NO') "IDENTITY_COLUMN" ` +
      `from SYS.SYSCOLUMNS a,sysobjects b ,` +
      `(select OBJECT_ID,OBJECT_NAME from dba_objects where (${identityCondition}) AND OBJECT_TYPE='TABLE') c` +
      ` where b.id=a.id  and a.id=c.OBJECT_ID`

    /** 扩展注释查询语句 */
    const comments = `select "C"."COLUMN_NAME","C"."COMMENTS","C"."TABLE_NAME" FROM user_col_comments "C" where (${columnsCondition})`

    /** 在原有语句上扩展查询数据 */
    const columnsSql = `SELECT * FROM "ALL_TAB_COLS" "C",(${identity}) "D",(${comments}) "E" WHERE ("C"."COLUMN_NAME"="D"."NAME" AND "C"."TABLE_NAME"="D"."OBJECT_NAME") AND ("C"."COLUMN_NAME"="E"."COLUMN_NAME" AND "E"."TABLE_NAME"="C"."TABLE_NAME") AND (${columnsCondition})`

    const indicesSql =
      `SELECT "C"."INDEX_NAME", "C"."OWNER", "C"."TABLE_NAME", "C"."UNIQUENESS", ` +
      `LISTAGG ("COL"."COLUMN_NAME", ',') WITHIN GROUP (ORDER BY "COL"."COLUMN_NAME") AS "COLUMN_NAMES" ` +
      `FROM "ALL_INDEXES" "C" ` +
      `INNER JOIN "ALL_IND_COLUMNS" "COL" ON "COL"."INDEX_OWNER" = "C"."OWNER" AND "COL"."INDEX_NAME" = "C"."INDEX_NAME" ` +
      `LEFT JOIN "ALL_CONSTRAINTS" "CON" ON "CON"."OWNER" = "C"."OWNER" AND "CON"."CONSTRAINT_NAME" = "C"."INDEX_NAME" ` +
      `WHERE (${columnsCondition}) AND "CON"."CONSTRAINT_NAME" IS NULL ` +
      `GROUP BY "C"."INDEX_NAME", "C"."OWNER", "C"."TABLE_NAME", "C"."UNIQUENESS"`

    const foreignKeysSql =
      `SELECT "C"."CONSTRAINT_NAME", "C"."OWNER", "C"."TABLE_NAME", "COL"."COLUMN_NAME", "REF_COL"."TABLE_NAME" AS "REFERENCED_TABLE_NAME", ` +
      `"REF_COL"."COLUMN_NAME" AS "REFERENCED_COLUMN_NAME", "C"."DELETE_RULE" AS "ON_DELETE" ` +
      `FROM "ALL_CONSTRAINTS" "C" ` +
      `INNER JOIN "ALL_CONS_COLUMNS" "COL" ON "COL"."OWNER" = "C"."OWNER" AND "COL"."CONSTRAINT_NAME" = "C"."CONSTRAINT_NAME" ` +
      `INNER JOIN "ALL_CONS_COLUMNS" "REF_COL" ON "REF_COL"."OWNER" = "C"."R_OWNER" AND "REF_COL"."CONSTRAINT_NAME" = "C"."R_CONSTRAINT_NAME" AND "REF_COL"."POSITION" = "COL"."POSITION" ` +
      `WHERE (${columnsCondition}) AND "C"."CONSTRAINT_TYPE" = 'R'`

    /** 此处约束条件有改造去除 末尾条件  AND "C"."GENERATED" = 'USER NAME' */
    const constraintsSql =
      `SELECT "C"."CONSTRAINT_NAME", "C"."CONSTRAINT_TYPE", "C"."OWNER", "C"."TABLE_NAME", "COL"."COLUMN_NAME", "C"."SEARCH_CONDITION" ` +
      `FROM "ALL_CONSTRAINTS" "C" ` +
      `INNER JOIN "ALL_CONS_COLUMNS" "COL" ON "COL"."OWNER" = "C"."OWNER" AND "COL"."CONSTRAINT_NAME" = "C"."CONSTRAINT_NAME" ` +
      `WHERE (${columnsCondition}) AND "C"."CONSTRAINT_TYPE" IN ('C', 'U', 'P')`

    const [dbColumns, dbIndices, dbForeignKeys, dbConstraints]: ObjectLiteral[][] =
      await Promise.all([
        this.query(columnsSql),
        this.query(indicesSql),
        this.query(foreignKeysSql),
        this.query(constraintsSql)
      ])
    // create tables for loaded tables
    return await Promise.all(
      dbTables.map(async dbTable => {
        const table = new Table()
        const owner =
          dbTable['OWNER'] === currentSchema &&
          (!this.driver.options.schema || this.driver.options.schema === currentSchema)
            ? undefined
            : dbTable['OWNER']
        table.database = currentDatabase
        table.schema = dbTable['OWNER']
        table.name = this.driver.buildTableName(dbTable['TABLE_NAME'], owner)

        // create columns from the loaded columns
        table.columns = await Promise.all(
          dbColumns
            .filter(
              dbColumn =>
                dbColumn['OWNER'] === dbTable['OWNER'] &&
                dbColumn['TABLE_NAME'] === dbTable['TABLE_NAME']
            )
            .map(async dbColumn => {
              const columnConstraints = dbConstraints.filter(
                dbConstraint =>
                  dbConstraint['OWNER'] === dbColumn['OWNER'] &&
                  dbConstraint['TABLE_NAME'] === dbColumn['TABLE_NAME'] &&
                  dbConstraint['COLUMN_NAME'] === dbColumn['COLUMN_NAME']
              )

              const uniqueConstraints = columnConstraints.filter(
                constraint => constraint['CONSTRAINT_TYPE'] === 'U'
              )
              const isConstraintComposite = uniqueConstraints.every(uniqueConstraint => {
                return dbConstraints.some(
                  dbConstraint =>
                    dbConstraint['OWNER'] === dbColumn['OWNER'] &&
                    dbConstraint['TABLE_NAME'] === dbColumn['TABLE_NAME'] &&
                    dbConstraint['COLUMN_NAME'] !== dbColumn['COLUMN_NAME'] &&
                    dbConstraint['CONSTRAINT_NAME'] === uniqueConstraint['CONSTRAINT_NAME'] &&
                    dbConstraint['CONSTRAINT_TYPE'] === 'U'
                )
              })

              const tableColumn = new TableColumn()
              tableColumn.name = dbColumn['COLUMN_NAME']
              tableColumn.type = dbColumn['DATA_TYPE'].toLowerCase()
              if (tableColumn.type.indexOf('(') !== -1) {
                tableColumn.type = tableColumn.type.replace(/\([0-9]*\)/, '')
              }

              // check only columns that have length property
              if (
                this.driver.withLengthColumnTypes.indexOf(tableColumn.type as ColumnType) !== -1
              ) {
                const length =
                  tableColumn.type === 'raw'
                    ? dbColumn['DATA_LENGTH']
                    : dbColumn['CHAR_COL_DECL_LENGTH']
                tableColumn.length =
                  length && !this.isDefaultColumnLength(table, tableColumn, length)
                    ? length.toString()
                    : ''
              }

              if (tableColumn.type === 'number' || tableColumn.type === 'float') {
                if (
                  dbColumn['DATA_PRECISION'] !== null &&
                  !this.isDefaultColumnPrecision(table, tableColumn, dbColumn['DATA_PRECISION'])
                ) {
                  tableColumn.precision = dbColumn['DATA_PRECISION']
                }
                if (
                  dbColumn['DATA_SCALE'] !== null &&
                  !this.isDefaultColumnScale(table, tableColumn, dbColumn['DATA_SCALE'])
                ) {
                  tableColumn.scale = dbColumn['DATA_SCALE']
                }
              } else if (
                (tableColumn.type === 'timestamp' ||
                  tableColumn.type === 'timestamp with time zone' ||
                  tableColumn.type === 'timestamp with local time zone') &&
                dbColumn['DATA_SCALE'] !== null
              ) {
                tableColumn.precision = !this.isDefaultColumnPrecision(
                  table,
                  tableColumn,
                  dbColumn['DATA_SCALE']
                )
                  ? dbColumn['DATA_SCALE']
                  : undefined
              }
              tableColumn.default =
                dbColumn['DATA_DEFAULT'] !== null &&
                dbColumn['DATA_DEFAULT'] !== undefined &&
                dbColumn['VIRTUAL_COLUMN'] === null &&
                dbColumn['DATA_DEFAULT'].trim() !== 'NULL'
                  ? (tableColumn.default = dbColumn['DATA_DEFAULT'].trim())
                  : undefined

              const primaryConstraint = columnConstraints.find(
                constraint => constraint['CONSTRAINT_TYPE'] === 'P'
              )
              if (primaryConstraint) {
                tableColumn.isPrimary = true
                // find another columns involved in primary key constraint
                const anotherPrimaryConstraints = dbConstraints.filter(
                  constraint =>
                    constraint['OWNER'] === dbColumn['OWNER'] &&
                    constraint['TABLE_NAME'] === dbColumn['TABLE_NAME'] &&
                    constraint['COLUMN_NAME'] !== dbColumn['COLUMN_NAME'] &&
                    constraint['CONSTRAINT_TYPE'] === 'P'
                )

                // collect all column names
                const columnNames = anotherPrimaryConstraints.map(
                  constraint => constraint['COLUMN_NAME']
                )
                columnNames.push(dbColumn['COLUMN_NAME'])

                // build default primary key constraint name
                const pkName = this.connection.namingStrategy.primaryKeyName(table, columnNames)

                // if primary key has user-defined constraint name, write it in table column
                if (primaryConstraint['CONSTRAINT_NAME'] !== pkName) {
                  tableColumn['primaryKeyConstraintName'] = primaryConstraint['CONSTRAINT_NAME']
                }
              }

              tableColumn.isNullable = dbColumn['NULLABLE'] === 'Y'
              tableColumn.isUnique = uniqueConstraints.length > 0 && !isConstraintComposite
              tableColumn.isGenerated = dbColumn['IDENTITY_COLUMN'] === 'YES'
              if (tableColumn.isGenerated) {
                tableColumn.generationStrategy = 'increment'
                tableColumn.default = undefined
              }
              /** 此处扩展注释信息的赋值 */
              tableColumn.comment = dbColumn['COMMENTS'] || '' // todo
              /** end */
              /** 暂时屏蔽虚拟column */
              // if (dbColumn['VIRTUAL_COLUMN'] === 'YES') {
              //   tableColumn.generatedType = 'VIRTUAL';

              //   const asExpressionQuery = await this.selectTypeormMetadataSql({
              //     table: dbTable['TABLE_NAME'],
              //     type: MetadataTableType.GENERATED_COLUMN,
              //     name: tableColumn.name
              //   });

              //   const results = await this.query(
              //     asExpressionQuery.query,
              //     asExpressionQuery.parameters
              //   );
              //   if (results[0] && results[0].value) {
              //     tableColumn.asExpression = results[0].value;
              //   } else {
              //     tableColumn.asExpression = '';
              //   }
              // }

              return tableColumn
            })
        )

        // find unique constraints of table, group them by constraint name and build TableUnique.
        const tableUniqueConstraints = OrmUtils.uniq(
          dbConstraints.filter(dbConstraint => {
            return (
              dbConstraint['TABLE_NAME'] === dbTable['TABLE_NAME'] &&
              dbConstraint['OWNER'] === dbTable['OWNER'] &&
              dbConstraint['CONSTRAINT_TYPE'] === 'U'
            )
          }),
          dbConstraint => dbConstraint['CONSTRAINT_NAME']
        )

        table.uniques = tableUniqueConstraints.map(constraint => {
          const uniques = dbConstraints.filter(
            dbC => dbC['CONSTRAINT_NAME'] === constraint['CONSTRAINT_NAME']
          )
          return new TableUnique({
            name: constraint['CONSTRAINT_NAME'],
            columnNames: uniques.map(u => u['COLUMN_NAME'])
          })
        })

        // find check constraints of table, group them by constraint name and build TableCheck.
        const tableCheckConstraints = OrmUtils.uniq(
          dbConstraints.filter(dbConstraint => {
            return (
              dbConstraint['TABLE_NAME'] === dbTable['TABLE_NAME'] &&
              dbConstraint['OWNER'] === dbTable['OWNER'] &&
              dbConstraint['CONSTRAINT_TYPE'] === 'C'
            )
          }),
          dbConstraint => dbConstraint['CONSTRAINT_NAME']
        )

        table.checks = tableCheckConstraints.map(constraint => {
          const checks = dbConstraints.filter(
            dbC =>
              dbC['TABLE_NAME'] === constraint['TABLE_NAME'] &&
              dbC['OWNER'] === constraint['OWNER'] &&
              dbC['CONSTRAINT_NAME'] === constraint['CONSTRAINT_NAME']
          )
          return new TableCheck({
            name: constraint['CONSTRAINT_NAME'],
            columnNames: checks.map(c => c['COLUMN_NAME']),
            expression: constraint['SEARCH_CONDITION']
          })
        })

        // find foreign key constraints of table, group them by constraint name and build TableForeignKey.
        const tableForeignKeyConstraints = OrmUtils.uniq(
          dbForeignKeys.filter(
            dbForeignKey =>
              dbForeignKey['OWNER'] === dbTable['OWNER'] &&
              dbForeignKey['TABLE_NAME'] === dbTable['TABLE_NAME']
          ),
          dbForeignKey => dbForeignKey['CONSTRAINT_NAME']
        )

        table.foreignKeys = tableForeignKeyConstraints.map(dbForeignKey => {
          const foreignKeys = dbForeignKeys.filter(
            dbFk =>
              dbFk['TABLE_NAME'] === dbForeignKey['TABLE_NAME'] &&
              dbFk['OWNER'] === dbForeignKey['OWNER'] &&
              dbFk['CONSTRAINT_NAME'] === dbForeignKey['CONSTRAINT_NAME']
          )
          return new TableForeignKey({
            name: dbForeignKey['CONSTRAINT_NAME'],
            columnNames: foreignKeys.map(dbFk => dbFk['COLUMN_NAME']),
            referencedDatabase: table.database,
            referencedSchema: dbForeignKey['OWNER'],
            referencedTableName: dbForeignKey['REFERENCED_TABLE_NAME'],
            referencedColumnNames: foreignKeys.map(dbFk => dbFk['REFERENCED_COLUMN_NAME']),
            onDelete: dbForeignKey['ON_DELETE'],
            onUpdate: 'NO ACTION' // Oracle does not have onUpdate option in FK's, but we need it for proper synchronization
          })
        })

        // create TableIndex objects from the loaded indices
        table.indices = dbIndices
          .filter(
            dbIndex =>
              dbIndex['TABLE_NAME'] === dbTable['TABLE_NAME'] &&
              dbIndex['OWNER'] === dbTable['OWNER']
          )
          .map(dbIndex => {
            return new TableIndex({
              name: dbIndex['INDEX_NAME'],
              columnNames: dbIndex['COLUMN_NAMES'].split(','),
              isUnique: dbIndex['UNIQUENESS'] === 'UNIQUE'
            })
          })

        return table
      })
    )
  }
}
