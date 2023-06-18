import { Global, Module } from '@nestjs/common'
import { PassPortController } from './passport.controller'
import { PassPortService } from './passport.service'

@Global()
@Module({
  controllers: [PassPortController],
  providers: [PassPortService],
  exports: [PassPortService]
})
export class PassPortModule {}
