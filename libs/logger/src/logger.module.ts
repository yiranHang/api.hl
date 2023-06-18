import { Module, DynamicModule } from '@nestjs/common'
import { LoggerService } from './logger.service'
import { LoggerAsyncOptions, LoggerOptions } from './logger.interface'
import { factoryToOptions, getModule } from './logger.constant'
@Module({})
export class LoggerModule {
  static forRoot(option?: LoggerOptions): DynamicModule {
    LoggerService.setLoggerOption(option || {})
    return getModule(option?.name)
  }
  /**
   *
   *
   * @static
   * @param {LoggerAsyncOptions} option
   * @memberof LoggerModule
   */
  static forRootAsync = (option: LoggerAsyncOptions) => {
    const options = (factoryToOptions(option as Required<LoggerAsyncOptions>) ||
      {}) as LoggerOptions

    return LoggerModule.forRoot(options)
  }
}
