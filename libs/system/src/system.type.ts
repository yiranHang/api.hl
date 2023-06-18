import { ModuleMetadata, RequestMethod } from '@nestjs/common'
import { RouteInfo, Type } from '@nestjs/common/interfaces'
/* eslint-disable @typescript-eslint/no-explicit-any */
export type NoSafe = any
export type KalendRbacOptions = {
  /**第一次初始化时候的配置信息 */
  initialize?: {
    administrator: {
      account?: string
      role?: string
    }
    rootName?: string
  }
  /**分页参数配置 */
  paging?: {
    page: string
    limit: string
    total: string
    result: string
  }
  /**
   * 实体是否软删，默认不软删
   * 由于树结构菜单和部门暂时不支持软删
   */
  softDelete?:
    | boolean
    | {
        user?: boolean
        role?: boolean
      }
  /**
   * 后端ACL 配置
   * 支持详细配置
   * forRoute 支持的路由或controller
   * exclude 去除的路由或者controller
   * 例如：https://docs.nestjs.cn/8/middlewares
   */
  acl?:
    | boolean
    | {
        exclude?: (Type<NoSafe> | RouteInfo)[]
      }
}

/**
 * 数据库设置(注意必须安顺序传递)
 * 第一项：当前连接名称,默认为defult，若存在重复的情况下会被覆盖
 * 第二项：数据库名称，默认链接postgres
 * 第三项：数据库模式名称,默认为public
 */
export type DBOption = [string?, string?, string?]

/**通过工厂模式传参数 */
export interface KalendRbacAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory?: (...args: NoSafe[]) => Promise<KalendRbacOptions> | KalendRbacOptions
  inject?: NoSafe[]
}

export type Pages<T> = {
  data: T[]
  count: number
  page: number
  limit: number
}

export type QueryEntity<T> = {
  [P in keyof T]?: T[P]
} & { [key: string]: number } & { ids?: string[] }

export type TMenu = Record<string, NoSafe>

export type Constructor = { new (...arg: NoSafe[]): void }

export type RouteMetaData = {
  [keof in RequestMethod]?: {
    isExcule: boolean
    path: RegExp
  }[]
}

export type Routers = {
  name: string
  allCheck?: boolean
  indeterminate?: boolean
  disabled?: boolean
  data: {
    path: string
    method: RequestMethod
    isExcule: boolean
    checked?: boolean
    disabled?: boolean
    description?: string
  }[]
}
