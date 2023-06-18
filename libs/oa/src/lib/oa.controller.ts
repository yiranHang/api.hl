import { WhiteAuthGuard } from '@admin-api/auth'
import { Controller, Post, Body, UseGuards } from '@nestjs/common'
import { OaService } from './oa.service'

@Controller('oa')
export class OaController {
  constructor(private readonly service: OaService) {}

  @UseGuards(WhiteAuthGuard)
  @Post('verify')
  verify(@Body() body: { token: string; sercet: string }) {
    return this.service.verify(body)
  }
}
