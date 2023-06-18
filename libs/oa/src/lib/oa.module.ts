import { DataBaseModule } from '@admin-hl/database'
import { DynamicModule, FactoryProvider, Module } from '@nestjs/common'
import { OaController } from './oa.controller'
import { OaRepository } from './oa.repository'
import { OaService } from './oa.service'
import { CONFIG, OaAsyncOption, OAOption } from './type'

@Module({})
export class OaModule {
  static forRoot(options: OAOption): DynamicModule {
    const oaProvider = [
      OaService,
      {
        provide: CONFIG,
        useValue: options
      }
    ]
    return {
      module: OaModule,
      global: true,
      imports: [
        DataBaseModule.forFeature([OaRepository], {
          name: options?.name,
          global: true,
          educe: true
        })
      ],
      controllers: [OaController],
      providers: [...oaProvider],
      exports: [...oaProvider]
    }
  }

  static forRootAsync(options: OaAsyncOption, name?: string): DynamicModule {
    const oaProvider = [
      OaService,
      {
        provide: CONFIG,
        ...(options || {})
      } as FactoryProvider
    ]
    return {
      module: OaModule,
      global: true,
      imports: [
        DataBaseModule.forFeature([OaRepository], {
          name,
          global: true,
          educe: true
        })
      ],
      controllers: [OaController],
      providers: [...oaProvider],
      exports: [...oaProvider]
    }
  }
}
