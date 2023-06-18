import { ExtractJwt, Strategy } from 'passport-jwt'
import { PassportStrategy } from '@nestjs/passport'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '../service/config.service'
// import { Cache } from 'cache-manager';
import { Request } from 'express'
import { AuthNoSafe } from '../auth.interface'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    readonly config: ConfigService // @Optional() @Inject(CACHE_MANAGER) private cache: Cache
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      passReqToCallback: true,
      secretOrKey: config.secret
    })
  }
  async validate(req: Request, payload: AuthNoSafe) {
    if (!payload) {
      throw new UnauthorizedException('当前登录信息已经过期，请重新登录')
    }
    // if (this.cache && this.config.redis?.single) {
    //   const { id } = payload || {};
    //   const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    //   const cacheToken = await this.cache.get(`id_${id}`);
    //   if (cacheToken && token !== cacheToken) {
    //     throw new UnauthorizedException('您账户已经在另一处登陆，请重新登陆');
    //   }
    // }
    return payload
  }
}
