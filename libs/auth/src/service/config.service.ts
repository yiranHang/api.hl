import { Inject, Injectable } from '@nestjs/common'
import { AUTH_LOGIN_PROVIDE_OPTION } from '../auth.constant'
import { AuthOption } from '../auth.interface'

@Injectable()
export class ConfigService {
  constructor(@Inject(AUTH_LOGIN_PROVIDE_OPTION) readonly option: AuthOption) {}

  get jwtOption() {
    return (
      this.option?.jwtOption || {
        secret: 'woshimiyao',
        signOptions: {
          expiresIn: '1 days'
        }
      }
    )
  }

  get secret() {
    return this.jwtOption?.secret || 'woshimiyao'
  }

  get enableJwtAuth() {
    return this.option?.enableJwtAuth || false
  }

  get extraGloadGuard() {
    return this.option?.extraGlobalGuard?.map(guard => new guard()) || []
  }

  get redis() {
    const { single = false, ttl = 60 * 60 * 24 } = this.option?.redis || {}
    return { single, ttl }
  }
}
