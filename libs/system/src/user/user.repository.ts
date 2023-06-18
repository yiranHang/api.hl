import { Repository } from 'typeorm'
import { User } from './user.entity'
import { CryptoUtil } from '../system.util'
import { BindRepository } from '@admin-api/database'

@BindRepository(User)
export class UserRepository extends Repository<User> {
  async getRoleAbilityApiById(id: string) {
    const result = await this.findOne({
      where: { id },
      relations: ['roles', 'roles.permissions', 'roles.permissions.menu']
    })
    const role = []
    const ability = []
    const api = []
    if (result?.roles) {
      result.roles.forEach(r => {
        role.push(r.code)
        r?.permissions.forEach(p => {
          if (p?.menu?.id) {
            ability.push(`${p.menu.link}:${p.code}`)
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
