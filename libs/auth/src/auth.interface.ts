import { ModuleMetadata } from '@nestjs/common'
import { JwtModuleOptions, JwtService } from '@nestjs/jwt'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AuthNoSafe = any
export type TFunction<T = void> = (...arg: AuthNoSafe[]) => T
export type CustomSign = (jwt: JwtService, data: AuthNoSafe) => string

/**加密方式，支持多字段加密和动态加密 */
export type TJwtOption = {
  sign?: string[] | CustomSign
  ttl?: number
  single?: boolean
}
export interface AuthAsyncOption extends Pick<ModuleMetadata, 'imports'> {
  useFactory?: (...args: AuthNoSafe[]) => Promise<AuthOption> | AuthOption
  inject?: AuthNoSafe[]
}

export interface AuthOption {
  /**JWT 配置信息
   * 主要配置sercet 默认：kalend
   * 超时时间 默认 1 days
   */
  jwtOption?: JwtModuleOptions
  /**返回的token 的别名 */
  tokenName?: string
  /**加密方式，支持多字段加密和动态加密 */
  sign?: string[] | CustomSign
  /**是否启用JWT token 认证 */
  enableJwtAuth?: boolean
  /**其他认证Guard,与JWT 都是放在全局守卫上 */
  extraGlobalGuard?: AuthNoSafe[]
  /**redis 配置，
   * 单点登录
   * 注意：redis使用nest 内置cahce 服务，
   * 使用前请确保以连接redis,否则无效
   */
  redis?: {
    ttl?: number
    single?: boolean
  }
}
