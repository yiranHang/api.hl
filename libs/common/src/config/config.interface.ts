import { TypeOrmModuleOptions } from '@nestjs/typeorm'

/**
 * 开澜配置信息选项
 *
 * @export
 * @type KalendConfigOption
 */
export type ConfigOption = {
  /**
   * 读取配置文件的名称
   *
   * @type {string}
   */
  file: string
  /**
   * 每次注入config是否都读取配置文件内容（默认:false）
   *
   * @type {boolean}
   */
  async?: boolean
}

/**
 * 开澜配置信息
 *
 * @export
 * @interface Config
 */
export interface Config {
  application?: IApplication
  logger?: ILogger
  /**
   * 数据库配置信息
   *
   * @type {TDataBase[]}
   * @memberof KalendConfig
   */
  databases?: TDataBase[]
  /**
   * Redis配置信息
   *
   * @type {IRedis}
   * @memberof KalendConfig
   */
  redis?: IRedis
}
/**
 * 应用配置信息
 *
 * @export
 * @interface IApplication
 */
export interface IApplication {
  host: string
  port: number
  passport: {
    secret: string
    expiresIn: string
  }
}

/**
 * 日志配置信息
 *
 * @export
 * @interface ILogger
 */
export interface ILogger {
  console?: boolean
  levels?: ['log' | 'error' | 'warn' | 'debug' | 'verbose']
  name?: string
}

/** 数据库配置信息
 *
 * @export
 * @type TDataBase
 * @extends {TypeOrmModuleOptions}
 */
export type TDataBase = {
  disabled?: boolean
} & TypeOrmModuleOptions

/**
 * Redis配置信息
 *
 * @export
 * @interface IRedis
 */
export interface IRedis {
  host: string
  port: number
  password: string
}
