import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { map, Observable } from 'rxjs'
import { AuthService } from '../service/auth.service'

import { JwtService } from '@nestjs/jwt'
import { CustomSign, TFunction, TJwtOption } from '../auth.interface'
import { isNotEmptyObject } from '../auth.constant'

@Injectable()
export class AuthLoginInterceptor<T = unknown> implements NestInterceptor<T, unknown> {
  constructor(
    private jwt: JwtService,
    private auth: AuthService // @Optional() @Inject(CACHE_MANAGER) private cache: Cache
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map(data => {
        const { tokenName, sign } = this.auth.getOptionByHandle(
          context.getHandler() as TFunction<TJwtOption>
        )
        const callBack: Record<string, unknown> = {
          user: data
        }
        if (this.jwt?.sign) {
          if (sign && typeof sign === 'function') {
            callBack[tokenName] = sign(this.jwt, data) as CustomSign
          } else if (isNotEmptyObject(data) && Array.isArray(sign)) {
            if (!sign.includes('id')) {
              sign.push('id')
            }
            const params: Record<string, string | null> = {}
            sign.forEach(o => {
              params[o] = data[o] || null
            })
            callBack[tokenName] = this.jwt.sign(params)
          }
          // if (this.cache && data?.id && single && callBack[tokenName]) {
          //   this.setCache(data?.id, callBack[tokenName] as string, ttl);
          // }
        }
        return callBack
      })
    )
  }

  // async setCache(id: string, token: string, ttl: number) {
  //   const key = `id_${id}`;
  //   await this.cache.set(key, token, ttl);
  // }
}
