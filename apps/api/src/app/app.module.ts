import { AuthModule } from '@admin-api/auth'
import { ConfigModule, ConfigService, RedisModule } from '@admin-api/common'
import { DataBaseModule } from '@admin-api/database'
import { DocumentsModule, NoSafe } from '@admin-api/documents'
import { OaModule, OAOption } from '@admin-api/oa'
import { CryptoUtil, SystemModule, UserRepository } from '@admin-api/system'
import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { PassPortModule } from './login/passport.module'
import { PassPortService } from './login/passport.service'
import { redisStore } from 'cache-manager-redis-store'
import { CacheStore } from '@nestjs/cache-manager'
import { LoggerModule } from '@admin-api/logger'

@Module({
  imports: [
    ConfigModule.forRoot(),
    DataBaseModule.forRootAsync({
      useFactory: (config: ConfigService) => {
        const dbconfig: NoSafe[] = config.get('database')
        dbconfig.forEach((item: NoSafe) => {
          item.password = CryptoUtil.sm4Decrypt(item.password)
        })
        return dbconfig
      },
      inject: [ConfigService]
    }),
    DocumentsModule.forRoot({
      noEtag: false
    }),
    SystemModule.forRoot([], {
      softDelete: {
        user: true
      },
      acl: true
    }),
    AuthModule.forRootAsync({
      useFactory: (user: UserRepository) => {
        return {
          enableJwtAuth: true,
          user
        }
      },
      inject: [UserRepository]
    }),
    RedisModule.registerAsync({
      useFactory: async (config: ConfigService) => {
        const option = config.get('redis') as NoSafe
        const store = await redisStore({
          socket: {
            host: option.host,
            port: option.port
          },
          password: option.password
        })
        return {
          store: store as unknown as CacheStore,
          ttl: 0
        }
      },
      inject: [ConfigService]
    }),
    OaModule.forRootAsync({
      imports: [AppModule],
      useFactory: async (ps: PassPortService) => {
        return {
          keysFn: ps.getOaSecretInfo.bind(ps),
          expiredIn: 3 * 6000,
          format: ps.format
        } as unknown as OAOption
      },
      inject: [PassPortService]
    }),
    LoggerModule.forRoot({
      console: true,
      levels: ['log', 'error', 'warn', 'debug', 'verbose']
    }),
    PassPortModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
