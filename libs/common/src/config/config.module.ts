import { Module, DynamicModule } from '@nestjs/common'
import { ConfigOption } from './config.interface'
import { ConfigProvider } from './config.provider'
@Module({})
export class ConfigModule {
  static forRoot(option?: ConfigOption): DynamicModule {
    Object.assign(ConfigProvider.prototype, { option })
    return {
      global: true,
      providers: [ConfigProvider],
      exports: [ConfigProvider],
      module: ConfigModule
    }
  }
}
