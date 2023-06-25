import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor
} from '@nestjs/common'
import { map, Observable } from 'rxjs'
import { OaService } from '../oa.service'
import { Request } from 'express'
import { Oa } from '../oa.entity'
import { NoSafe } from '../type'

@Injectable()
export class OaInterceptor<T = unknown> implements NestInterceptor<T, unknown> {
  constructor(private oa: OaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest() as Request & {
      user: { id: string }
    }
    const type = request?.query?.['type'] as string
    const { id } = request?.user || {}
    return next.handle().pipe(
      map(async data => {
        if (!type) {
          throw new HttpException('缺少关键字段,type', HttpStatus.FORBIDDEN)
        }
        const [sercet, expiredIn = 0] = await this.oa.getOption(type as string)
        if (!sercet) {
          throw new HttpException('type 值不存在，请联系管理员', HttpStatus.FORBIDDEN)
        }
        const timestamp = new Date().getTime()
        const content = {
          expiresIn: expiredIn === 0 ? 0 : timestamp + (expiredIn as number) * 1000,

          data
        }
        const token = this.oa.sm4Encrypt(content, sercet as string)
        await this.storeOaInfo(token, type, sercet as string, id)
        return token
      })
    )
  }

  async storeOaInfo(token: string, type: string, sercet: string, id: string) {
    const info = {
      token,
      type,
      sercet
    } as Oa
    if (id) {
      info.user = { id } as NoSafe
    }
    await this.oa.storeOa(info)
  }
}
