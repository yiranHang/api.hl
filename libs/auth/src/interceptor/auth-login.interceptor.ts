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
        const callBack: Record<string, unknown> = {}
        // 确保 user 字段始终存在（即使 data 为 null 也显式写入，避免 JSON 序列化静默丢弃）
        callBack['user'] = data ?? null
        if (this.jwt?.sign) {
          if (sign && typeof sign === 'function') {
            callBack[tokenName] = sign(this.jwt, data) as CustomSign
          } else if (isNotEmptyObject(data) && Array.isArray(sign)) {
            // 避免直接 mutate 共享的 sign 数组
            const signFields = sign.includes('id') ? [...sign] : [...sign, 'id']
            const params: Record<string, string | null> = {}
            signFields.forEach(o => {
              params[o] = data[o] || null
            })
            callBack[tokenName] = this.jwt.sign(params)
          }
        }
        return { data: callBack, code: 200 }
      })
    )
  }

  // async setCache(id: string, token: string, ttl: number) {
  //   const key = `id_${id}`;
  //   await this.cache.set(key, token, ttl);
  // }
}
