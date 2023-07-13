import { JwtLogin, Loginer } from '@admin-api/auth'
import { Body, Controller, Get, Post } from '@nestjs/common'
import { OaToken } from '@admin-api/oa'
import { PassPortService } from './passport.service'
import { ExcludeControllerAcl } from '@admin-api/system'

@ExcludeControllerAcl()
@Controller('passport')
export class PassPortController {
  constructor(private readonly service: PassPortService) {}

  @JwtLogin()
  @Post('login')
  async login(@Body() loginInfo: { data: string }) {
    return this.service.loginByPass(loginInfo.data)
  }

  // @UseGuards(WhiteAuthGuard)
  /**
   * 掉用此处的值需将用户群体的key放入header
   * @param user
   * @returns
   */
  @OaToken()
  @Get('oatoken')
  async getOaToken(@Loginer() user: { id: string }) {
    return this.service.getOaToken(user?.id)
  }
}
