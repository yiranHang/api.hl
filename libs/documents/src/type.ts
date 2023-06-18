/* eslint-disable @typescript-eslint/no-explicit-any */
import { ModuleMetadata } from '@nestjs/common'
export type NoSafe = any
export const FILE_OPTION = Symbol('FILE_OPTION')
export type TFileOption = {
  originalname: string
  buffer: Buffer
}
/**通过工厂模式传参数 */
export interface FileAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory?: (...args: NoSafe[]) => FileOption
  inject?: NoSafe[]
}
export type FileOption = {
  /**文件存放的相对地址 */
  path?: string
  /**是否开启etag判断 */
  noEtag?: boolean
  /**文件存放的库名称 */
  name?: string
  /**下载文件包每次最大读取量 */
  highWaterMark?: number
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

export type ClicingOption = {
  status: 0 | 1 // 0 空闲状态 1 正在写入
  currentWrite: number
  fileName: string
  shardCount: number
  signature: string
  slices: any
  time: number
  survivalTime: number
}
