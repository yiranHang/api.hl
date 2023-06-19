import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { QueryEntity } from '../system.type'
import { DictDetail } from './dict-detail.entity'
import { Dict } from './dict.entity'
import { DictService } from './dict.service'

@Controller('dict')
export class DictController {
  constructor(readonly service: DictService) {}

  @Get()
  getMany(@Query() query: QueryEntity<Dict>) {
    return this.service.getMany(query)
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.service.getOne(id)
  }

  @Delete(':id')
  deleteOne(@Param('id') id: string) {
    return this.service.deleteData(id)
  }

  @Patch(':id')
  updateOne(@Param('id') id: string, @Body() body: Dict) {
    return this.service.updateOne(id, body)
  }

  @Post()
  createOne(@Body() body: Dict) {
    return this.service.createOne(body)
  }

  @Post('delete')
  deleteMany(@Body('ids') ids: string | string[]) {
    return this.service.deleteData(ids)
  }

  @Get('/check/:key')
  checkKeyExists(@Param('key') key: string, @Query('id') id: string) {
    return this.service.checkKeyExists(key, id)
  }

  @Post('/detail/one')
  createDetailOne(@Body() body: DictDetail) {
    return this.service.createDetailOne(body)
  }

  @Get('/detail/one')
  getDetailMany(@Query() query: QueryEntity<DictDetail>) {
    return this.service.getDetailMany(query)
  }

  @Get('/detail/one/:id')
  getDetailOne(@Param('id') id: string) {
    return this.service.getDetailOne(id)
  }

  @Delete('/detail/one/:id')
  deleteDetailOne(@Param('id') id: string) {
    return this.service.deleteDetailData(id)
  }

  @Post('/detail/one/delete')
  deleteDetailMany(@Body('ids') ids: string | string[]) {
    return this.service.deleteDetailData(ids)
  }

  @Patch('/detail/one/:id')
  updateDetailOne(@Param('id') id: string, @Body() body: DictDetail) {
    return this.service.updateDetailOne(id, body)
  }

  @Get('/enum/:key')
  getEnumByKey(@Param('key') key: string) {
    return this.service.getEnumByKey(key)
  }
}
