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
  updateMany(
    @Body('acl') acl: Permission[],
    @Body() { user, department }: { user: string; department: string }
  ) {
    return this.service.updateManyPermission(acl, user, department)
  }

  @Delete('/:id')
  deleteOne(@Param('id') id: string) {
    return this.service.deletePermission(id)
  }

  @Patch('/:id')
  updateOne(@Param('id') id: string, @Body() body: Permission) {
    return this.service.updatePermission(id, body)
  }

  @Post('/delete')
  deleteMany(@Body('ids') ids: string | string[]) {
    return this.service.deletePermission(ids)
  }

  @Get('/:id')
  getPermission(@Param('id') id: string) {
    return this.service.getPermission(id)
  }

  @Get()
  getMany(@Query() query: QueryEntity<Permission>) {
    return this.service.getPermissionMany(query)
  }

  @Get('/check/:code')
  checkCodeExists(
    @Param('code') code: string,
    @Query() { id, menu }: { id: string; menu: string }
  ) {
    return this.service.checkCodeExists(code, id, menu)
  }
}
