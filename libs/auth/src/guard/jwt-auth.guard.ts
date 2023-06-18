import { ExecutionContext, Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { GlobalAuthGuard } from './global-auth.guard'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = GlobalAuthGuard.isSkip(context)
    if (!skip) {
      return !!(await (super.canActivate(context) as Promise<boolean>))
    }
    return skip
  }
}
