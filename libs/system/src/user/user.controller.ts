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
  getOne(@Param() { id }) {
    return this.service.getOne(id)
  }

  @Get('/check/:account')
  checkUserExists(@Param() { account }, @Query() { id }) {
    return this.service.checkUserExists(account, id)
  }

  @Delete(':id')
  deleteOne(@Param() { id }) {
    return this.service.deleteData(id)
  }

  @Patch(':id')
  updateOne(@Param() { id }, @Body() body: User) {
    return this.service.updateOne(id, body)
  }

  @Patch('/password/:id')
  updatePassword(@Param() { id }, @Body() { password }) {
    return this.service.updatePassword(id, password)
  }

  //清空token的数据
  @Patch(':id')
  updateToken(@Param() { id }) {
    return this.service.updatePassword(id, '')
  }

  @Post()
  createOne(@Body() body: User) {
    return this.service.createOne(body)
  }

  @Post('delete')
  deleteMany(@Body() { ids }) {
    return this.service.deleteData(ids)
  }

  @Get('/router/choose')
  getRouterChoose(@Query() { path }) {
    return this.service.getRouterChoose(path)
  }
}
