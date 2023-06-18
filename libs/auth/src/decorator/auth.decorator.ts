import {
  applyDecorators,
  createParamDecorator,
  ExecutionContext,
  UseGuards,
  UseInterceptors
} from '@nestjs/common'
import { JWT_SIGN } from '../auth.constant'
import { AuthNoSafe, TJwtOption } from '../auth.interface'
import { WhiteAuthGuard } from '../guard/white-auth.guard'
import { AuthLoginInterceptor } from '../interceptor/auth-login.interceptor'

/**
 * 登录装饰器，直接装饰某个接口
 *
 * @param option
 * @returns
 */
export function JwtLogin(option?: TJwtOption) {
  return (target: object, propertyKey: string, descriptor: TypedPropertyDescriptor<AuthNoSafe>) => {
    Reflect.defineMetadata(JWT_SIGN, option, descriptor.value)
    applyDecorators(UseInterceptors(AuthLoginInterceptor), UseGuards(WhiteAuthGuard))(
      target,
      propertyKey,
      descriptor
    )

    return descriptor
  }
}

/**
 * 获取解析后的token 信息
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Loginer = createParamDecorator((data: string, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest()
  const user = request.user
  return data ? user && user[data] : user
})
