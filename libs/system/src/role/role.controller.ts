import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ExcludePropertyAcl } from '../system.decorator'
import { QueryEntity } from '../system.type'
import { Role } from './role.entity'
import { RoleService } from './role.service'

@Controller('role')
export class RoleController {
  constructor(readonly service: RoleService) {}

  @Get()
  getMany(@Query() query: QueryEntity<Role>) {
    return this.service.getMany(query)
  }

  @ExcludePropertyAcl()
  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.service.getOne(id)
  }

  @Get('/check/:code')
  checkRoleExists(@Param('code') code: string, @Query('id') id: string) {
    return this.service.checkRoleExists(code, id)
  }

  @Delete(':id')
  deleteOne(@Param('id') id: string) {
    return this.service.deleteData(id)
  }

  @Patch(':id')
  updateOne(@Param('id') id: string, @Body() body: Role) {
    return this.service.updateOne(id, body)
  }

  @Post()
  createOne(@Body() body: Role) {
    return this.service.createOne(body)
  }

  @Get('/list/valid')
  getList() {
    return this.service.getList()
  }

  @Post('delete')
  deleteMany(@Body('ids') ids: string | string[]) {
    return this.service.deleteData(ids)
  }

  @Get('/tree')
  getTree() {
    return this.service.getTree()
  }
}
