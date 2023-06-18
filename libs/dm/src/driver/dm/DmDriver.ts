import {
  ColumnType,
  DataSource,
  DriverOptionNotSetError,
  DriverPackageNotInstalledError,
  ReplicationMode,
  TableColumn
} from 'typeorm'
import { ColumnMetadata } from 'typeorm/metadata/ColumnMetadata'
import { DmConnectionOptions, NoSafe } from './DmConnectionOptions'
import { DmQueryRunner } from './DmQueryRunner'
import { OracleDriver } from 'typeorm/driver/oracle/OracleDriver'
import { OracleConnectionCredentialsOptions } from 'typeorm/driver/oracle/OracleConnectionCredentialsOptions'
import { OracleConnectionOptions } from 'typeorm/driver/oracle/OracleConnectionOptions'
import { ApplyValueTransformers } from 'typeorm/util/ApplyValueTransformers'
import { DateUtils } from 'typeorm/util/DateUtils'
import { parse, stringify } from 'wellknown'
import * as DM from 'dmdb'
/**
 * Organizes communication with DMDB RDBMS.
 */
export class DmDriver extends OracleDriver {
  spatialTypes: ColumnType[] = ['st_geometry', 'st_point']
  spatialFeatureType = [
    'point',
    'curve',
    'lineString',
    'surface',
    'polygon',
    'geomCollection',
    'multipoint',
    'multicurve',
    'multilinestring',
    'multisurface',
    'multipolygon'
  ]
  supportedDataTypes: ColumnType[] = [
    'char',
    'nchar',
    'nvarchar2',
    'varchar2',
    'long',
    'raw',
    'long raw',
    'number',
    'numeric',
    'float',
    'dec',
    'decimal',
    'integer',
    'int',
    'smallint',
    'real',
    'double precision',
    'date',
    'timestamp',
    'timestamptz',
    'timestamp with time zone',
    'timestamp with local time zone',
    'interval year to month',
    'interval day to second',
    'bfile',
    'blob',
    'clob',
    'nclob',
    'rowid',
    'urowid',
    'boolean',
    'st_geometry',
    'st_point'
  ]
  options: DmConnectionOptions & OracleConnectionOptions
  constructor(connection: DataSource) {
    super(connection)
  }

  /**
   * 生成达梦数据库空间
   * 数据类型的插入语句
   *
   * @param paramName
   * @param column
   * @returns
   */
  getGeometryExpression(paramName: string, column: ColumnMetadata) {
    if (column.type === 'st_point') {
      return `dmgeo.ST_PointFromText(${paramName}, ${column.srid || 0})`
    }
    if (column.type === 'st_geometry') {
      if (!this.spatialFeatureType.includes(column.spatialFeatureType as string)) {
        return `dmgeo.ST_GeoMFromText(${paramName}, ${column.srid || 0})`
      } else {
        switch (column.spatialFeatureType) {
          case 'point':
            return `dmgeo.ST_PointFromText(${paramName}, ${column.srid || 0})`
          case 'lineString':
            return `dmgeo.ST_LineFromText(${paramName}, ${column.srid || 0})`
          case 'polygon':
            return `dmgeo.ST_PolyFromText(${paramName}, ${column.srid || 0})`

          case 'multipoint':
            return `dmgeo.ST_MPointFromText(${paramName}, ${column.srid || 0})`
          case 'multilinestring':
            return `dmgeo.ST_MLineFromText(${paramName}, ${column.srid || 0})`
          case 'multipolygon':
            return `dmgeo.ST_MLineFromText(${paramName}, ${column.srid || 0})`
        }
      }
    }
  }

  /**
   * 加载所有驱动程序依赖项。
   */
  protected loadDependencies(): void {
    try {
      this.oracle = require('dmdb')
      this.oracle.OBJECT = DM.OUT_FORMAT_OBJECT
    } catch (e) {
      throw new DriverPackageNotInstalledError('dmdb', 'dmdb')
    }
  }

  /**
   * 为给定的数据库凭据创建新的连接池。
   *
   * @param options
   * @returns
   */
  protected async createPool(
    options: OracleConnectionOptions,
    credentials?: OracleConnectionCredentialsOptions
  ): Promise<NoSafe> {
    const {
      host,
      port,
      username,
      password,
      poolMax,
      poolMin,
      poolTimeout,
      poolAlias,
      testOnBorrow,
      validationQuery,
      ...arg
    } = options as unknown as DmConnectionOptions
    if (credentials) {
      //TODO
    }
    /**进行相关错误判断 */
    if (!password) {
      throw new DriverOptionNotSetError('password')
    }
    if (!username) {
      throw new DriverOptionNotSetError('username')
    }
    if (!host) {
      throw new DriverOptionNotSetError('host')
    }
    if (!port) {
      throw new DriverOptionNotSetError('port')
    }
    /** 拼接dm链接 */
    // eslint-disable-next-line no-useless-escape
    let connectString = `dm://${username}:${password}\@${host}:${port}?autoCommit=true`
    if (Object.keys(arg).length > 0) {
      Object.keys(arg).forEach(k => {
        if (['boolean', 'number', 'string'].includes(typeof arg[k])) {
          connectString += `&${k}=${arg[k]}`
        }
      })
    }
    return new Promise<void>((ok, fail) => {
      this.oracle.createPool(
        {
          connectString,
          ...{
            poolMax,
            poolMin,
            poolTimeout,
            poolAlias,
            testOnBorrow,
            validationQuery
          }
        },
        (err: Error, pool: NoSafe) => {
          if (err) {
            return fail(err)
          }
          ok(pool)
        }
      )
    })
  }

  /**
   * 创建用于执行数据库查询的查询运行程序。
   */
  createQueryRunner(mode: ReplicationMode) {
    return new DmQueryRunner(this, mode)
  }

  createFullType(column: TableColumn): string {
    let type = column.type

    // used 'getColumnLength()' method, because in Oracle column length is required for some data types.
    if (this.getColumnLength(column)) {
      type += `(${this.getColumnLength(column)})`
    } else if (
      column.precision !== null &&
      column.precision !== undefined &&
      column.scale !== null &&
      column.scale !== undefined
    ) {
      type += `(${column.precision},${column.scale})`
    } else if (column.precision !== null && column.precision !== undefined) {
      type += `(${column.precision})`
    }

    if (column.type === 'timestamp with time zone') {
      type = `TIMESTAMP${
        column.precision !== null && column.precision !== undefined ? `(${column.precision})` : ''
      } WITH TIME ZONE`
    } else if (column.type === 'timestamptz') {
      type = 'timestamp'
    } else if (column.type === 'timestamp with local time zone') {
      type = `TIMESTAMP${
        column.precision !== null && column.precision !== undefined ? `(${column.precision})` : ''
      } WITH LOCAL TIME ZONE`
    } else if (this.spatialTypes.indexOf(column.type as ColumnType) >= 0) {
      let start = `"SYSGEO".`
      if (
        column.type === 'st_geometry' &&
        this.spatialFeatureType.includes(column.spatialFeatureType as string)
      ) {
        start += `"ST_${column.spatialFeatureType?.toUpperCase()}"`
        type = start
      } else {
        type = `"SYSGEO"."${column.type.toUpperCase()}"`
      }
    }

    if (['boolean', 'bool'].includes(column.type.toLowerCase())) {
      type = 'BIT'
    }

    if (column.isArray) {
      type += ' array'
    }

    if (type === 'number') {
      type = 'INT'
    }
    return type
  }

  /**
   * 达梦数据库
   * 空间类型的特殊判断
   * 判断空间类型是否变化
   *
   * @param column
   * @param targetType
   * @returns
   */
  contrastType(column: ColumnMetadata, targetType: string) {
    let type = this.normalizeType(column)

    if (['boolean', 'bool'].includes(type)) {
      type = 'bit'
    }
    const getSpecialType = () => {
      if (column.type === 'st_point') {
        return `class234881125`
      }
      if (column.type === 'st_geometry') {
        if (!this.spatialFeatureType.includes(column.spatialFeatureType as string)) {
          return `class234881124`
        } else {
          switch (column.spatialFeatureType) {
            case 'point':
              return `class234881125`
            case 'curve':
              return 'class234881126'
            case 'lineString':
              return `class234881127`
            case 'surface':
              return `class234881128`
            case 'polygon':
              return `class234881129`
            case 'geomCollection':
              return `class234881130`
            case 'multipoint':
              return `class234881131`
            case 'multicurve':
              return `class234881132`
            case 'multilinestring':
              return `class234881133`
            case 'multisurface':
              return `class234881134`
            case 'multipolygon':
              return `class234881135`
          }
        }
      }
    }

    if (this.spatialTypes.includes(column.type)) {
      return targetType !== getSpecialType()
    }
    return targetType !== type
  }

  normalizeType(column: {
    type?: ColumnType
    length?: number | string
    precision?: number | null
    scale?: number
    isArray?: boolean
  }) {
    const type = super.normalizeType(column)
    if (type === 'timestamptz') {
      return 'timestamp'
    }
    return type === 'number' ? 'int' : type
  }

  /**
   * 格式化一个注释
   */
  protected escapeComment(comment?: string) {
    if (!comment) {
      return ''
    }
    // eslint-disable-next-line no-control-regex
    comment = comment.replace(/\u0000/g, '') // Null bytes aren't allowed in comments
    return comment
  }

  findChangedColumns(
    tableColumns: TableColumn[],
    columnMetadatas: ColumnMetadata[]
  ): ColumnMetadata[] {
    return columnMetadatas.filter(columnMetadata => {
      const tableColumn = tableColumns.find(c => c.name === columnMetadata.databaseName)
      if (!tableColumn) {
        return false
      }
      const isColumnChanged =
        tableColumn.name !== columnMetadata.databaseName ||
        this.contrastType(columnMetadata, tableColumn.type) ||
        tableColumn.length !== this.getColumnLength(columnMetadata) ||
        tableColumn.precision !== columnMetadata.precision ||
        tableColumn.scale !== columnMetadata.scale ||
        /** 此处扩展ORACLE 支持注释的添加 （start） */
        tableColumn.comment !== this.escapeComment(columnMetadata.comment) ||
        /** end */
        tableColumn.default !== this.normalizeDefault(columnMetadata) ||
        tableColumn.isPrimary !== columnMetadata.isPrimary ||
        tableColumn.isNullable !== columnMetadata.isNullable ||
        tableColumn.asExpression !== columnMetadata.asExpression ||
        tableColumn.generatedType !== columnMetadata.generatedType ||
        tableColumn.isUnique !== this.normalizeIsUnique(columnMetadata) ||
        (columnMetadata.generationStrategy !== 'uuid' &&
          tableColumn.isGenerated !== columnMetadata.isGenerated)

      /** 此处做调试的需要，用来判断查询的列信息是否正确 */
      // if (isColumnChanged) {
      //   console.log(tableColumn.name, isColumnChanged);
      //   console.log(tableColumn.name !== columnMetadata.databaseName);
      //   console.log('77777777', columnMetadata.type, tableColumn.type);
      //   console.log(
      //     '6666',
      //     this.contrastType(columnMetadata, tableColumn.type)
      //   );
      //   console.log(
      //     tableColumn.length !== this.getColumnLength(columnMetadata)
      //   );
      //   console.log(tableColumn.precision !== columnMetadata.precision);
      //   console.log(tableColumn.scale !== columnMetadata.scale);
      //   console.log(
      //     tableColumn.comment,
      //     this.escapeComment(columnMetadata.comment)
      //   );
      //   console.log(
      //     tableColumn.default !== this.normalizeDefault(columnMetadata)
      //   );
      //   console.log(tableColumn.isPrimary !== columnMetadata.isPrimary);
      //   console.log(tableColumn.isNullable !== columnMetadata.isNullable);
      //   console.log(tableColumn.asExpression !== columnMetadata.asExpression);
      //   console.log(tableColumn.generatedType !== columnMetadata.generatedType);
      //   console.log(
      //     tableColumn.isUnique !== this.normalizeIsUnique(columnMetadata)
      //   );
      //   console.log(
      //     columnMetadata.generationStrategy !== 'uuid' &&
      //       tableColumn.isGenerated !== columnMetadata.isGenerated
      //   );
      // }
      return isColumnChanged
    })
  }

  /**
   * 预处理查出数据
   * 达梦数据库对空间数据进行特殊处理
   *
   * @param value
   * @param columnMetadata
   * @returns
   */
  prepareHydratedValue(value: NoSafe, columnMetadata: ColumnMetadata) {
    if (value === null || value === undefined) {
      return columnMetadata.transformer
        ? ApplyValueTransformers.transformFrom(columnMetadata.transformer, value)
        : value
    }

    if (columnMetadata.type === Boolean) {
      value = !!value
    } else if (columnMetadata.type === 'date') {
      value = DateUtils.mixedDateToDateString(value)
    } else if (columnMetadata.type === 'time') {
      value = DateUtils.mixedTimeToString(value)
    } else if (
      columnMetadata.type === Date ||
      columnMetadata.type === 'timestamp' ||
      columnMetadata.type === 'timestamp with time zone' ||
      columnMetadata.type === 'timestamp with local time zone'
    ) {
      value = DateUtils.normalizeHydratedDate(value)
    } else if (columnMetadata.type === 'json') {
      value = JSON.parse(value)
    } else if (columnMetadata.type === 'simple-array') {
      value = DateUtils.stringToSimpleArray(value)
    } else if (columnMetadata.type === 'simple-json') {
      value = DateUtils.stringToSimpleJson(value)
    } else if (columnMetadata.type === Number) {
      // convert to number if number
      value = !isNaN(+value) ? parseInt(value) : value
      /** 达梦数据库扩展空间数据(wkt 转geojosn)（start） */
    } else if (this.spatialTypes.includes(columnMetadata.type)) {
      try {
        value = parse(value)
      } catch (error) {
        //TODO  出错如何处理
      }
    } else if (['boolean', 'bool'].includes(columnMetadata.type as string)) {
      value = value === 1 ? true : false
    }
    /** end */
    if (columnMetadata.transformer) {
      value = ApplyValueTransformers.transformFrom(columnMetadata.transformer, value)
    }
    return value
  }

  /**
   * 预处理插入数据
   * 达梦数据库对空间数据进行特殊处理
   *
   * @param value
   * @param columnMetadata
   * @returns
   */
  preparePersistentValue(value: NoSafe, columnMetadata: ColumnMetadata) {
    if (columnMetadata.transformer) {
      value = ApplyValueTransformers.transformTo(columnMetadata.transformer, value)
    }

    if (value === null || value === undefined) {
      return value
    }

    if (columnMetadata.type === Boolean) {
      return value === true ? 1 : 0
    } else if (columnMetadata.type === 'date') {
      return DateUtils.mixedDateToDateString(value)
    } else if (columnMetadata.type === 'time') {
      return DateUtils.mixedDateToTimeString(value)
    } else if (
      columnMetadata.type === 'datetime' ||
      columnMetadata.type === Date ||
      columnMetadata.type === 'timestamp' ||
      columnMetadata.type === 'timestamptz' ||
      columnMetadata.type === 'timestamp with time zone' ||
      columnMetadata.type === 'timestamp without time zone'
    ) {
      return DateUtils.mixedDateToDate(value)
    } else if (['json', 'jsonb'].includes(columnMetadata.type as string)) {
      return JSON.stringify(value)
    } else if (columnMetadata.type === 'simple-array') {
      return DateUtils.simpleArrayToString(value)
    } else if (columnMetadata.type === 'simple-json') {
      return DateUtils.simpleJsonToString(value)
      /** 达梦数据库预处理插入数据，geojson 转wkt (start) */
    } else if (this.spatialTypes.includes(columnMetadata.type)) {
      try {
        value = stringify(value)
      } catch (error) {
        //TODO  出错如何处理
      }
    }
    /** end */
    return value
  }
}
