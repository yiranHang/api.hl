import { LogLevel, ModuleMetadata } from '@nestjs/common'

/* eslint-disable @typescript-eslint/no-explicit-any */
export type NoSafe = any
export const LOG_SING = Symbol('LOG_SING')
export const LOG_NAME = Symbol('LOG_NAME')
export type LoggerOptions = {
  levels?: LogLevel[]
  /**
   * 支持 console 输出
   *
   * @type {boolean}
   */
  console?: boolean
  name?: string
}

/**通过工厂模式传参数 */
export interface LoggerAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory?: (...args: NoSafe[]) => LoggerOptions
  inject?: NoSafe[]
}

export type QueryDto = {
  name?: string
  type?: string
  content?: string
}

export type ExtralMsg = {
  type: LogLevel
  message: NoSafe
}

export type QueryEntity<T> = {
  [P in keyof T]?: T[P]
} & {
  pi?: number
  ps?: number
}

export type PagingData<T> = {
  data: T[]
  count: number
  page: number
  limit: number
}
