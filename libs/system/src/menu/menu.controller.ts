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

  @Get(':id')
  @ExcludePropertyAcl()
  getOne(@Param() { id }) {
    return this.service.getOne(id)
  }

  @Delete(':id')
  deleteOne(@Param() { id }) {
    return this.service.deleteData(id)
  }

  @Patch(':id')
  updateOne(@Param() { id }, @Body() body: Menu) {
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

  @Get('/check/:link')
  checkLinkExists(@Param() { link }, @Query() { id }) {
    return this.service.checkLinkExists(decodeURIComponent(link), id)
  }

  @Get('/tree/:user')
  getTreeMenuByUser(@Param() { user }) {
    return this.service.getRoleMenuAclByUser(user)
  }

  @Post('delete')
  deleteMany(@Body() { ids }) {
    return this.service.deleteData(ids)
  }

  @Get('/list/search')
  getListSearch(@Query() { name }) {
    return this.service.getListSearch(decodeURIComponent(name))
  }
}
