import { DictService } from './dict.service'
import { DynamicModule, Module } from '@nestjs/common'
import { DictController } from './dict.controller'
import { DBOption } from '../system.type'
import { DataBaseModule } from '@admin-hl/database'
import { DictDetailRepository, DictRepository } from './dict.repository'

@Module({})
export class DictModule {
  static forRoot = (arg: DBOption): DynamicModule => {
    const providers = [DictService]
    const module = DataBaseModule.forFeature([DictRepository, DictDetailRepository], {
      name: arg?.[0],
      global: true,
      educe: true
    })
    return {
      module: DictModule,
      global: true,
      imports: [module],
      controllers: [DictController],
      providers: [...providers],
      exports: [...providers]
    }
  }
}
