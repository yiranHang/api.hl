import { Controller, Get, Param, Query } from '@nestjs/common'
import { Logger } from './logger.entity'
import { LoggerService } from './logger.service'
import { QueryEntity } from './logger.interface'

@Controller('logger')
export class LoggerController {
  constructor(private service: LoggerService) {}

  @Get()
  getMany(@Query() query: QueryEntity<Logger>) {
    return this.service.getMany(query)
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.service.getOne(id)
  }
}
