import { NoSafe } from '@admin-api/database'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable } from '@nestjs/common'
import { Cache } from 'cache-manager'

@Injectable()
export class RedisService {
  constructor(@Inject(CACHE_MANAGER) private cache: Cache) {}

  async get(key: string) {
    return this.cache.get(key)
  }

  async set(key: string, value: NoSafe, expire?: number) {
    if (expire) {
      return this.cache.set(key, value, expire)
    } else {
      return this.cache.set(key, value)
    }
  }

  async reset() {
    return this.cache.reset()
  }

  async del(key: string) {
    return this.cache.del(key)
  }
}
