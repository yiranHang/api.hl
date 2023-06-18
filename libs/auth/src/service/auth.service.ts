import { Injectable } from '@nestjs/common'
import { ApplicationConfig, Reflector } from '@nestjs/core'
import { JWT_SIGN } from '../auth.constant'
import { TFunction, TJwtOption } from '../auth.interface'
import { GlobalAuthGuard } from '../guard/global-auth.guard'
import { JwtAuthGuard } from '../guard/jwt-auth.guard'
import { ConfigService } from './config.service'

@Injectable()
export class AuthService {
  constructor(
    private app: ApplicationConfig,
    private reflector: Reflector,
    private config: ConfigService
  ) {}

  getOptionByHandle(handle: TFunction<TJwtOption>) {
    const result = this.reflector.get(JWT_SIGN, handle) || {}
    const { tokenName = 'access_token', sign = [] } = this.config?.option || {}

    const option = {
      tokenName,
      sign: result?.sign || sign,
      ttl: result?.ttl || this.config.redis.ttl,
      single: result?.single || this.config.redis.single
    }
    return option
  }

  /**
   * 初始化全局JWT 认证
   * 注意：暂时仅支持初始化一次
   */
  initializeGuard() {
    const guards = this.app.getGlobalGuards().some(r => r instanceof GlobalAuthGuard)
    if (!guards) {
      const guard = [...this.config.extraGloadGuard]
      if (this.config.enableJwtAuth) {
        guard.push(new JwtAuthGuard())
      }
      if (guard.length) {
        this.app.useGlobalGuards(new GlobalAuthGuard(guard))
      }
      process.on('uncaughtException', () => {
        //TODO 部分异常无法捕捉需在此处监听，防止程序奔溃
      })
    }
  }
}
