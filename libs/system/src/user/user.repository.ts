import { Repository } from 'typeorm'
import { User } from './user.entity'
import { CryptoUtil } from '../system.util'
import { BindRepository } from '@admin-api/database'
import { Permission } from '../permission/permission.entity'

@BindRepository(User)
export class UserRepository extends Repository<User> {
  async getRoleAbilityApiById(id: string) {
    const result = await this.findOne({
      where: { id },
      relations: ['roles', 'roles.permissions', 'roles.permissions.menu']
    })
    const role = [] as unknown as string[]
    const ability = [] as unknown as string[]
    const api = [] as unknown as Permission[]
    if (result?.roles) {
      result.roles.forEach(r => {
        r.code && role.push(r.code)
        r?.permissions.forEach(p => {
          if (p?.menu?.id) {
            ability.push(`${p.menu.path}:${p.code}`)
          }
          if (p?.path && p.method && !p.forbidden) {
            api.push(p)
          }
        })
      })
    }
    return { role, ability, api }
  }

  cryptoPassword(password: string) {
    return CryptoUtil.encryptPassWord(password)
  }
}
