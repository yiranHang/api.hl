import { DynamicModule, Module } from '@nestjs/common'
import { PermissionService } from './permission.service'
import { PermissionController } from './permission.controller'
import { DBOption } from '../system.type'
import { ConfigService } from '../core/service/config.service'
import { DataBaseModule } from '@admin-api/database'
import { PermissionRepository } from './permission.repository'

@Module({})
export class PermissionModule {
  static forRoot = (arg: DBOption): DynamicModule => {
    const providers = [ConfigService, PermissionService]
    const module = DataBaseModule.forFeature([PermissionRepository], {
      name: arg?.[0],
      global: true,
      educe: true
    })
    return {
      module: PermissionModule,
      global: true,
      imports: [module],
      controllers: [PermissionController],
      providers: [...providers],
      exports: [...providers]
    }
  }
}
