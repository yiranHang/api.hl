import { DynamicModule, Module } from '@nestjs/common'
import { RoleService } from './role.service'
import { RoleController } from './role.controller'
import { DBOption } from '../system.type'
import { ConfigService } from '../core/service/config.service'
import { DataBaseModule } from '@admin-api/database'
import { RoleRepository } from './role.repository'

@Module({})
export class RoleModule {
  static forRoot = (arg: DBOption): DynamicModule => {
    const providers = [ConfigService, RoleService]
    const module = DataBaseModule.forFeature([RoleRepository], {
      name: arg?.[0],
      global: true,
      educe: true
    })
    return {
      module: RoleModule,
      global: true,
      imports: [module],
      controllers: [RoleController],
      providers: [...providers],
      exports: [...providers]
    }
  }
}
