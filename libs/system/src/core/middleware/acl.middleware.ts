import { Injectable, NestMiddleware, Optional, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { NextFunction, Request } from 'express'
import { parse } from 'url'
import { Permission } from '../../permission/permission.entity'
import { RouteMetaData } from '../../system.type'
import { AclService } from '../service/acl.service'
import { RedisService } from '@admin-api/common'

@Injectable()
export class AclMiddleware implements NestMiddleware {
  metaData: RouteMetaData = AclService.routeMetadata

  requestMethod = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  constructor(
    @Optional() private jwt: JwtService,
    private redis: RedisService
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const { path, method } = this.getCheckPath(req)
    const id = this.getUserId(req)
    if (id) {
      const acl = JSON.parse((await this.redis.get(`api:${id}`)) as string)
      const isOk = this.isOk(acl, path, method)
      if (isOk) {
        next()
      } else {
        this.throwNoAclException()
      }
    } else {
      this.throwNoAclException()
    }
  }

  throwNoAclException(message?: string) {
    throw new UnauthorizedException(message || '当前请求无效，没有权限')
  }

  isOk(acl: Permission[] | void, path: RegExp, method: string) {
    if (acl && acl.length) {
      return acl.some(r => path.test(r.path as string) && r.method === method)
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
