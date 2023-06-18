import { DynamicModule, Module } from '@nestjs/common'
import { MenuService } from './menu.service'
import { MenuController } from './menu.controller'

import { DBOption } from '../system.type'
import { ConfigService } from '../core/service/config.service'
import { DataBaseModule } from '@admin-hl/database'
import { MenuRepository } from './menu.repository'

@Module({})
export class MenuModule {
  static forRoot = (arg: DBOption): DynamicModule => {
    const providers = [ConfigService, MenuService]
    const module = DataBaseModule.forFeature([MenuRepository], {
      name: arg?.[0],
      global: true,
      educe: true,
      isTree: true
    })
    return {
      module: MenuModule,
      global: true,
      imports: [module],
      controllers: [MenuController],
      providers: [...providers],
      exports: [...providers]
    }
  }
}
