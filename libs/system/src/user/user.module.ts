import { UserService } from './user.service'
import { DynamicModule, Module } from '@nestjs/common'
import { UserController } from './user.controller'
import { DBOption } from '../system.type'
import { ConfigService } from '../core/service/config.service'
import { DataBaseModule } from '@admin-hl/database'
import { UserRepository } from './user.repository'

@Module({})
export class UserModule {
  static forRoot = (arg: DBOption): DynamicModule => {
    const providers = [ConfigService, UserService]
    const module = DataBaseModule.forFeature([UserRepository], {
      name: arg?.[0],
      global: true,
      educe: true
    })
    return {
      module: UserModule,
      global: true,
      imports: [module],
      controllers: [UserController],
      providers: [...providers],
      exports: [...providers]
    }
  }
}
