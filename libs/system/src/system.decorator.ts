import { SetMetadata } from '@nestjs/common'
import { Constructor, NoSafe } from './system.type'
import { EXCLUDE_ACL_CONTROLLER, EXCLUDE_ACL_PROPERTY } from './system.constant'

/**
 * 后端ACL权限点、类装饰器
 * 用于排除指定Controller
 *
 * @Date 2022/05/30
 * @returns {ClassDecorator}
 */
export function ExcludeControllerAcl(): ClassDecorator {
  return SetMetadata(EXCLUDE_ACL_CONTROLLER, true)
}

/**
 * 后端ACL权限点、方法装饰器
 * 用于排除指定method
 *
 * @Date 2022/05/30
 * @returns {MethodDecorator}
 */
export function ExcludePropertyAcl(): MethodDecorator {
  return function (
    target: Constructor,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<NoSafe>
  ) {
    const origin = Reflect.getMetadata(EXCLUDE_ACL_PROPERTY, target.constructor) || []
    Reflect.defineMetadata(EXCLUDE_ACL_PROPERTY, [descriptor, ...origin], target.constructor)
    return descriptor
  }
}
