import { ModuleMetadata } from '@nestjs/common'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type NoSafe = any
export const CONFIG = Symbol('CONFIG')
export const OA_SIGN = Symbol('OA_SIGN')
export interface OaAsyncOption extends Pick<ModuleMetadata, 'imports'> {
  useFactory?: (...args: NoSafe[]) => Promise<OAOption>
  inject?: NoSafe[]
}
export type KeysConfig = {
  // 秒，token 超时时间
  expiredIn: number
  // 生成和解析token 的密钥
  secret: string
}
export type OAOption = {
  name?: string
  keys?: {
    [key: string]: string[]
  }
  expiredIn: number
  keysFn?: () => Promise<{
    [key: string]: string[]
  }>
  format?: <T>(data: T) => NoSafe
}

export type ContentOption<T> = {
  expiresIn: number
  data: T
}
