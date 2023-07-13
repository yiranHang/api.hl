import { CanActivate, ExecutionContext, HttpException, Injectable } from '@nestjs/common'
import { lastValueFrom, Observable } from 'rxjs'
import { WhiteAuthGuard } from './white-auth.guard'

@Injectable()
export class GlobalAuthGuard implements CanActivate {
  private guard: CanActivate[]
  constructor(guard?: CanActivate[]) {
    this.guard = guard || []
  }
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (GlobalAuthGuard.isSkip(context)) {
      return true
    }
    return this.isOk(context)
  }

  async isOk(context: ExecutionContext): Promise<boolean> {
    let isOk!: boolean | void
    for (const g of this.guard) {
      try {
        if (g.canActivate(context) instanceof Promise) {
          isOk = await (g.canActivate(context) as Promise<boolean>)
        } else if (g.canActivate(context) instanceof Observable) {
          isOk = await lastValueFrom(g.canActivate(context) as Observable<boolean>)
        } else {
          isOk = g.canActivate(context) as boolean
        }
        if (isOk) {
          break
        }
      } catch (err: unknown) {
        const error = err as Record<string, number>
        throw new HttpException((err as Error)?.message || '权限认证失败', error?.['status'] || 403)
      }
    }
    return !!isOk
  }

  static isSkip(context: ExecutionContext): boolean {
    const cls = Reflect.getOwnMetadata('__guards__', context.getClass()) || []
    const hlr = Reflect.getOwnMetadata('__guards__', context.getHandler()) || []

    const isSkip = [...cls, ...hlr].some(fn => new WhiteAuthGuard() instanceof fn)
    return isSkip
      ? true
      : [...cls, ...hlr].length && [...cls, ...hlr].some(C => new C())
      ? true
      : false
  }
}
