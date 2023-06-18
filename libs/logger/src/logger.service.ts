import { Injectable, LogLevel, Logger } from '@nestjs/common'
import { FindManyOptions } from 'typeorm'
import { Logger as Lg } from './logger.entity'
import { ExtralMsg, LoggerOptions, NoSafe, PagingData, QueryEntity } from './logger.interface'
import { LoggerRepository } from './logger.repositroy'
@Injectable()
export class LoggerService extends Logger {
  protected static option: LoggerOptions
  protected static logs: LoggerRepository
  constructor(private repository: LoggerRepository) {
    LoggerService.logs = repository
    super()
  }
  /**
   * 获取日志记录
   */
  async getMany(query: QueryEntity<Lg>): Promise<PagingData<Lg>> {
    const { pi, ps, category } = query || {}
    const findCondition = {} as FindManyOptions<Lg>
    const where = {} as NoSafe
    const page = isNaN(Number(pi)) ? 1 : Number(pi)
    const limit = isNaN(Number(ps)) ? 0 : Number(ps)
    if (limit > 0) {
      findCondition.skip = Math.abs(page - 1) * limit
      findCondition.take = limit
    }
    if (category) {
      where.category = category
    }
    if (Object.keys(where).length) {
      findCondition.where = where
    }
    const [data, count] = await this.repository.findAndCount(findCondition)
    return {
      data,
      count,
      page,
      limit
    }
  }
  /**
   * 获取日志内容
   *
   */
  async getOne(id: string) {
    return this.repository.findOne({ where: { id } })
  }

  async createOne<T = Lg>(data: T) {
    return this.save(data)
  }

  save(info: Partial<Lg>, extral?: ExtralMsg) {
    if (extral?.type && LoggerService[extral.type]) {
      LoggerService[extral.type](extral.message, info.from || 'LoggerService')
    }
    return LoggerService.save(info, extral)
  }

  static setLoggerOption(option: LoggerOptions) {
    LoggerService.option = {
      levels: ['log', 'error', 'warn', 'debug', 'verbose'],
      console: false,
      ...(option || {})
    } as LoggerOptions

    // 覆盖console输出等级
    LoggerService.overrideLogger(LoggerService.option.levels as LogLevel[])
    if (LoggerService.option.console) {
      const log = console.log
      console.log = (...arg: NoSafe[]) => {
        if (LoggerService.isLevelEnabled('log')) {
          log(...arg)
        }
      }
    }
  }

  /**
   * 保存日志内容-静态
   *
   */
  static save(info: Partial<Lg>, extral?: ExtralMsg) {
    if (extral?.type && LoggerService[extral.type]) {
      LoggerService[extral.type](extral.message, info.from || 'LoggerService')
    }
    return LoggerService?.logs?.save(info)
  }
}
