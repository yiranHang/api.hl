/* eslint-disable @typescript-eslint/no-explicit-any */
import { ModuleMetadata } from '@nestjs/common'
import { TypeOrmModuleOptions } from '@nestjs/typeorm'
export type NoSafe = any
/**扩展typeorm 配置信息 */
export type ITypeOrmModuleOptions = {
  disabled?: boolean
} & TypeOrmModuleOptions

export interface DatabaseModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory?: (...args: NoSafe[]) => ITypeOrmModuleOptions | ITypeOrmModuleOptions[]
  inject?: NoSafe[]
}

export type MOption = {
  name?: string
  global?: boolean
  educe?: boolean
  isTree?: boolean
}
