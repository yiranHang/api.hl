import {
  applyDecorators,
  createParamDecorator,
  ExecutionContext,
  UseInterceptors
} from '@nestjs/common'
import { OaInterceptor } from '../interceptor/oa.interceptor'
import { NoSafe } from '../type'

/**
 * 用于生成OAtoken
 *
 * @returns
 */
export function OaToken() {
  return (target: object, propertyKey: string, descriptor: TypedPropertyDescriptor<NoSafe>) => {
    applyDecorators(UseInterceptors(OaInterceptor))(target, propertyKey, descriptor)
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
