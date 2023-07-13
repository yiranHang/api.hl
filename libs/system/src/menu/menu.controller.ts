import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ExcludePropertyAcl } from '../system.decorator'
import { QueryEntity } from '../system.type'
import { Menu } from './menu.entity'
import { MenuService } from './menu.service'
@Controller('menu')
export class MenuController {
  constructor(readonly service: MenuService) {}

  @Get()
  getMany(@Query() query: QueryEntity<Menu>) {
    return this.service.getMany(query)
  }

  @Get('list')
  getManyList() {
    return this.service.getManyList()
  }

  @Get(':id')
  @ExcludePropertyAcl()
  getOne(@Param('id') id: string) {
    return this.service.getOne(id)
  }

  @Delete(':id')
  deleteOne(@Param('id') id: string) {
    return this.service.deleteData(id)
  }

  @Patch(':id')
  updateOne(@Param('id') id: string, @Body() body: Menu) {
    return this.service.updateOne(id, body)
  }

  @Post()
  createOne(@Body() body: Menu) {
    return this.service.createOne(body)
  }

  @Get('/permission/tree')
  getPermissionTree() {
    return this.service.getPermissionTree()
  }

  @Get('/check/:path')
  checkPathExists(@Param('path') path: string, @Query('id') id: string) {
    return this.service.checkPathExists(decodeURIComponent(path), id)
  }

  @ExcludePropertyAcl()
  @Get('/tree/:user')
  getTreeMenuByUser(@Param('user') user: string) {
    return this.service.getRoleMenuAclByUser(user)
  }

  @Post('delete')
  deleteMany(@Body('ids') ids: string | string[]) {
    return this.service.deleteData(ids)
  }

  @Get('/list/search')
  getListSearch(@Query('name') name: string) {
    return this.service.getListSearch(decodeURIComponent(name))
  }
}
