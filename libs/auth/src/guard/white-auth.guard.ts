import { CanActivate } from '@nestjs/common'
export class WhiteAuthGuard implements CanActivate {
  canActivate(): boolean {
    return true
  }
}
