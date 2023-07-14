import { Module, DynamicModule } from '@nestjs/common'
import { ConfigService } from './config.service'
import { ConfigOption } from './config.interface'
@Module({})
export class ConfigModule {
  static forRoot(option?: ConfigOption): DynamicModule {
    Object.assign(ConfigService.prototype, { option })
    return {
      global: true,
      providers: [ConfigService],
      exports: [ConfigService],
      module: ConfigModule
    }
  }
}
