import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { QueryEntity } from '../system.type'
import { Permission } from './permission.entity'
import { PermissionService } from './permission.service'

@Controller('permission')
export class PermissionController {
  constructor(readonly service: PermissionService) {}

  @Post()
  createOne(@Body() body: Permission) {
    return this.service.addPermission(body)
  }

  @Post('/update')
  updateMany(@Body('acl') acl: Permission[], @Body() { user, department }) {
    return this.service.updateManyPermission(acl, user, department)
  }

  @Delete('/:id')
  deleteOne(@Param() { id }) {
    return this.service.deletePermission(id)
  }

  @Patch('/:id')
  updateOne(@Param() { id }, @Body() body: Permission) {
    return this.service.updatePermission(id, body)
  }

  @Post('/delete')
  deleteMany(@Body() { ids }) {
    return this.service.deletePermission(ids)
  }

  @Get('/:id')
  getPermission(@Param() { id }) {
    return this.service.getPermission(id)
  }

  @Get()
  getMany(@Query() query: QueryEntity<Permission>) {
    return this.service.getPermissionMany(query)
  }

  @Get('/check/:code')
  checkCodeExists(@Param() { code }, @Query() { id, menu }) {
    return this.service.checkCodeExists(code, id, menu)
  }
}
