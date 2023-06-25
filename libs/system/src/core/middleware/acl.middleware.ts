import { HttpException, Injectable, Optional } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Request } from 'express'
import { parse } from 'url'
import { Permission } from '../../permission/permission.entity'
import { PermissionService } from '../../permission/permission.service'
import { RouteMetaData } from '../../system.type'
import { AclService } from '../service/acl.service'

@Injectable()
export class AclMiddleware {
  metaData: RouteMetaData = AclService.routeMetadata

  requestMethod = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  constructor(@Optional() private jwt: JwtService, private ps: PermissionService) {}

  throwNoAclException(message?: string) {
    throw new HttpException(message || '当前请求无效，没有权限', 405)
  }

  isOk(acl: Permission[] | void, path: RegExp) {
    if (acl && acl.length) {
      return acl.some(r => path.test(r.path as string))
    }
    return false
  }

  getCheckPath(req: Request) {
    const { method, originalUrl } = req
    const path = parse(originalUrl).pathname
    const index = this.requestMethod.findIndex(f => f === method.toUpperCase())
    const meta = this.metaData[index].find(
      (r: { isExcule: boolean; path: RegExp }) => !r.isExcule && r.path.test(path as string)
    )
    return meta ? { ...meta, method } : null
  }

  getUserId(req: Request): string {
    const { authorization } = req.headers
    const { user } = req.query || {}
    const { id } = (this.jwt?.decode((authorization as string)?.split(' ')[1]) || {}) as Record<
      'id',
      string
    >
    return id ?? (user as string)
  }
}
