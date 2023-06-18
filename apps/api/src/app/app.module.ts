import { AuthModule } from '@admin-api/auth'
import { ConfigModule, ConfigProvider } from '@admin-api/common'
import { DataBaseModule } from '@admin-api/database'
import { DocumentsModule } from '@admin-api/documents'
import { SystemModule, UserRepository } from '@admin-api/system'
import { Sm4Decrypt } from '@admin-api/utils'
import { Module } from '@nestjs/common'

import { AppController } from './app.controller'
import { AppService } from './app.service'

@Module({
  imports: [
    DataBaseModule.forRootAsync({
      imports: [ConfigModule.forRoot()],
      useFactory: (config: ConfigProvider) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dbconfig: any[] = config.get('database')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dbconfig.forEach((item: any) => {
          item.password = Sm4Decrypt(item.password)
        })
        return dbconfig
      },

      inject: [ConfigProvider]
    }),
    DocumentsModule.forRoot({
      noEtag: true
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
    })
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
