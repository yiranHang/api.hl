import { AuthModule } from '@admin-api/auth'
import { ConfigModule, ConfigProvider } from '@admin-api/common'
import { DataBaseModule } from '@admin-api/database'
import { DocumentsModule } from '@admin-api/documents'
import { OaModule, OAOption } from '@admin-api/oa'
import { CryptoUtil, SystemModule, UserRepository } from '@admin-api/system'
import { Module } from '@nestjs/common'

import { AppController } from './app.controller'
import { AppService } from './app.service'
import { PassPortModule } from './login/passport.module'
import { PassPortService } from './login/passport.service'

@Module({
  imports: [
    DataBaseModule.forRootAsync({
      imports: [ConfigModule.forRoot()],
      useFactory: (config: ConfigProvider) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dbconfig: any[] = config.get('database')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dbconfig.forEach((item: any) => {
          item.password = CryptoUtil.sm4Decrypt(item.password)
        })
        return dbconfig
      },

      inject: [ConfigProvider]
    }),
    DocumentsModule.forRoot({
      noEtag: false
    }),
    SystemModule.forRoot([], {
      softDelete: {
        user: true
      },
      acl: false
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
    PassPortModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
