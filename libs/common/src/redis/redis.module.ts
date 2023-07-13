import { Global, Module } from '@nestjs/common'
import { RedisService } from './redis.service'
import { CacheModuleAsyncOptions, CacheModule } from '@nestjs/cache-manager'

@Global()
@Module({})
export class RedisModule {
  static async registerAsync(option: CacheModuleAsyncOptions) {
    return {
      module: RedisModule,
      imports: [CacheModule.registerAsync(option)],
      providers: [RedisService],
      exports: [RedisService]
    }
  }
}
