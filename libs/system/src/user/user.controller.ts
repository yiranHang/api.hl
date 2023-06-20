import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { QueryEntity } from '../system.type'
import { User } from './user.entity'
import { UserService } from './user.service'

@Controller('user')
export class UserController {
  constructor(readonly service: UserService) {}

  @Get()
  getMany(@Query() query: QueryEntity<User>) {
    return this.service.getMany(query)
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.service.getOne(id)
  }

  @Get('/check/:account')
  checkUserExists(@Param('account') account: string, @Query('id') id: string) {
    return this.service.checkUserExists(account, id)
  }

  @Delete(':id')
  deleteOne(@Param('id') id: string) {
    return this.service.deleteData(id)
  }

  @Patch(':id')
  updateOne(@Param('id') id: string, @Body() body: User) {
    return this.service.updateOne(id, body)
  }

  @Patch('/password/:id')
  updatePassword(@Param('id') id: string, @Body('password') password?: string) {
    return this.service.updatePassword(id, password)
  }

  //清空token的数据
  @Patch(':id')
  updateToken(@Param('id') id: string) {
    return this.service.updatePassword(id, '')
  }

  @Post()
  createOne(@Body() body: User) {
    return this.service.createOne(body)
  }

  @Post('delete')
  deleteMany(@Body('ids') ids: string | string[]) {
    return this.service.deleteData(ids)
  }

  @Get('/router/choose')
  getRouterChoose(@Query('path') path: string) {
    return this.service.getRouterChoose(path)
  }
}
