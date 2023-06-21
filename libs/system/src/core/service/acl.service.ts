import { Injectable, MiddlewareConsumer, RequestMethod, Type } from '@nestjs/common'
import { OnModuleInit, RouteInfo } from '@nestjs/common/interfaces'
import { ApplicationConfig, DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core'
import { mapToExcludeRoute } from '@nestjs/core/middleware/utils'
import { Constructor, NoSafe, RouteMetaData, Routers } from '../../system.type'
import { EXCLUDE_ACL_CONTROLLER, EXCLUDE_ACL_PROPERTY } from '../../system.constant'
import { AclMiddleware } from '../middleware/acl.middleware'
import { ConfigService } from './config.service'
import { getControllerName } from '../../system.util'

@Injectable()
export class AclService implements OnModuleInit {
  /**全局的接口前缀 */
  private prefix = ''
  /**放置所有地址的数组 */
  private routers: Routers[] = []
  /**默认的5种请求方式 */
  requestMethod = ['get', 'post', 'put', 'delete', 'patch']
  /**按照接口的请求方式对接口进行分组 */
  static routeMetadata: RouteMetaData = {}
  constructor(
    private readonly discoveryService: DiscoveryService,
    private app: ApplicationConfig,
    private reflector: Reflector,
    private readonly config: ConfigService
  ) {}

  onModuleInit() {
    /**赋值全局的接口前缀 */
    this.prefix = this.app.getGlobalPrefix()
    /**初始化所有接口 */
    this.setAllRoutes()
  }

  /**
   * 根据路径拼接一个
   * 完整的接口路径
   *
   * @Date 2022/05/30
   * @param {string} controller 对应controller 的路径
   * @param {string | string[]} path 对应方法的路径
   * @returns {string[]}
   */
  private getCompletePath(controller: string, path: string | string[]): string[] {
    const pathArr = (path: string) => {
      return path ? path.split('/').filter(f => f) : []
    }
    const routes = Array.isArray(path) ? path : [path]
    return routes.map((r: string) => {
      const route = pathArr(this.prefix).concat(pathArr(controller)).concat(pathArr(r))

      return `/${route.join('/')}`
    })
  }

  /**
   * 生成一个完整的controller
   * 下的所有接口
   *
   * @Date 2022/05/30
   * @param {Constructor} target 对应controller的类
   * @param {NoSafe} value 对应方法的Descriptor
   * @returns {{method:RequestMethod,path:string}[]}
   */
  private getPathVersinMethod(
    target: Constructor,
    value: NoSafe
  ): { method: RequestMethod; path: string }[] {
    const [controller, path] = this.reflector.getAll('path', [target, value])
    const method: RequestMethod = this.reflector.get('method', value)
    //TODO 此处可扩展version
    const paths = this.getCompletePath(controller, path)
    return paths.map(p => {
      return {
        method,
        path: p
      }
    })
  }

  /**
   * 生成一个完整的controller
   * 下的所有接口
   *
   * @Date 2022/05/30
   * @param {Constructor} target 对应controller的类
   * @returns {RouteInfo[]}
   */
  private getRouteInfos(target: Constructor): RouteInfo[] {
    const descriptor = this.reflector.get(EXCLUDE_ACL_PROPERTY, target) || []
    const result: RouteInfo[] = []
    if (descriptor && descriptor.length) {
      descriptor.forEach((d: { value: NoSafe }) => {
        const record = this.getPathVersinMethod(target, d.value)
        result.push(...record)
      })
    }
    return result
  }

  /**
   * 生成所有接口信息
   *
   * @Date 2022/05/30
   * @returns {void}
   */
  private setAllRoutes(): void {
    /**创建MetadataScanner 实例 */
    const metadataScanner = new MetadataScanner()
    /**根据请求方式分组请求接口 */
    const setRouteMetadata = (r: RouteInfo & { isExcule: boolean }) => {
      const { requestMethod, pathRegex } = mapToExcludeRoute([r])[0]
      if (AclService.routeMetadata[requestMethod]) {
        AclService.routeMetadata[requestMethod].push({
          isExcule: r.isExcule,
          path: pathRegex
        })
      } else {
        AclService.routeMetadata[requestMethod] = [
          {
            isExcule: r.isExcule,
            path: pathRegex
          }
        ]
      }
    }
    /**通过nest自带的discoveryService 获取所有的controller */
    this.discoveryService.getControllers().forEach(c => {
      const isExclude: boolean | undefined = this.reflector.get(EXCLUDE_ACL_CONTROLLER, c.metatype)
      const prototype = Object.getPrototypeOf(c.instance)
      const name = getControllerName(c?.instance?.constructor.name)
      const router: Routers = {
        name,
        data: []
      }
      /**使用MetadataScanner实例对Controller 下的mothod进行遍历  */

      const exculePath = this.getRouteInfos(c.instance.constructor)
      metadataScanner.scanFromPrototype(c.instance, prototype, (name: string) => {
        const descriptor = prototype[name]
        return this.getPathVersinMethod(c.instance.constructor, descriptor).forEach(
          (
            r: RouteInfo & {
              isExcule: boolean
            }
          ) => {
            const isExcule = isExclude
              ? true
              : exculePath.some(e => e.method === r.method && e.path === r.path)

            r.isExcule = isExcule
            router.data.push(r)
            setRouteMetadata(r)
          }
        )
      })
      const isHas = this.routers.findIndex(r => r.name === getControllerName(name))
      if (isHas < 0) {
        this.routers.push(router)
      } else {
        this.routers[isHas].data.forEach(r => {
          const has = router.data.some(d => d.path === r.path && d.method === r.method)
          if (!has) {
            router.data.push(r)
          }
        })
        this.routers[isHas] = router
      }
    })
  }

  /**
   * 根据ACL 中间件设置白名单
   *
   * @see [setAclMiddleware] (https://docs.nestjs.com/middleware#middleware-consumer)
   * @Date 2022/05/30
   * @param {MiddlewareConsumer} consumer
   * @return {void}
   */
  setAclMiddleware(consumer: MiddlewareConsumer): void {
    const { sign, fun, ob } = this.config.getExcludeController()
    if (sign) {
      this.discoveryService.getControllers().forEach(c => {
        const isExclude: boolean | undefined = this.reflector.get(
          EXCLUDE_ACL_CONTROLLER,
          c.metatype
        )
        if (!isExclude && !fun.some(f => f === c.metatype)) {
          fun.push(c.metatype as Type<NoSafe>)
          ob.push(...this.getRouteInfos(c.metatype as Constructor))
        }
      })
      consumer
        .apply(AclMiddleware)
        .exclude(...ob)
        .forRoutes(...fun)
    }
  }

  /**
   * 获取路由
   *
   * @Date 2022/05/30
   * @return {Routers[]}
   */
  getRouters(): Routers[] {
    return [...this.routers]
  }
}
