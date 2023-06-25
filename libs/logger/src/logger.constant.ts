import { LoggerController } from './logger.controller'
import { LoggerService } from './logger.service'
import { LoggerAsyncOptions } from './logger.interface'
import { LoggerModule } from './logger.module'
import { DataBaseModule } from '@admin-api/database'
import { LoggerRepository } from './logger.repositroy'

export const getModule = (name?: string) => {
  const module = DataBaseModule.forFeature([LoggerRepository], {
    name: name,
    global: true,
    educe: true
  })
  return {
    global: true,
    module: LoggerModule,
    import: [module],
    controllers: [LoggerController],
    providers: [LoggerService],
    exports: [LoggerService]
  }
}

/**
 * 将factory注入方式的转为时间value
 * 不支持嵌套注入
 *
 * @param factory
 * @returns
 */
export const factoryToOptions = (factory: Required<LoggerAsyncOptions>) => {
  const inject = (factory.inject || []).map(r => (typeof r === 'function' ? new r() : r))
  const options = factory.useFactory(...inject)
  return options
}
