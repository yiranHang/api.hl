import { HttpException, Injectable } from '@nestjs/common'
import { Equal, FindManyOptions, In, Like, Not } from 'typeorm'
import { AclService } from '../core/service/acl.service'
import { ConfigService } from '../core/service/config.service'
import { Pages, QueryEntity } from '../system.type'
import { CryptoUtil } from '../system.util'
import { Role } from '../role/role.entity'
import { UserRepository } from './user.repository'
import { User } from './user.entity'
import { DataBaseSource } from '@admin-api/database'
import { MenuService } from '../menu/menu.service'
@Injectable()
export class UserService {
  constructor(
    readonly repo: UserRepository,
    private acl: AclService,
    private config: ConfigService,
    private dataSource: DataBaseSource,
    private menu: MenuService
  ) {}

  async validUser(user: User, password?: string) {
    if (!user) {
      throw new HttpException('账号不存在，请重新输入', 500)
    } else {
      if (user.forbidden) {
        throw new HttpException('该账号以被禁用，请联系管理员', 401)
      }
      if (user.status !== 0) {
        throw new HttpException('该账号状态异常，请联系管理员', 401)
      }

      if (password && user.password !== this.repo.cryptoPassword(password)) {
        throw new HttpException('密码不正确，请重新输入', 401)
      }
      const { hasMenu } = await this.menu.getRoleMenuAclByUser(user.id as string)
      if (!hasMenu) {
        throw new HttpException('当前账号没权限访问', 401)
      }
    }
  }
  /**
   * 用户登录
   */
  async loginByPass(data: string) {
    const { userName, password } = CryptoUtil.sm4Decrypt(data) || {}
    console.log('🚀 ~ UserService ~ password:', password)
    console.log('🚀 ~ UserService ~ userName:', userName)
    const user = await this.repo.findOne({
      where: { account: Equal(userName) },
      relations: ['roles']
    })
    await this.validUser(user as User, password)
    await this.repo.update(user?.id as string, {
      count: 0,
      freezeTime: undefined
    })
    return user
  }

  async getMany(query: QueryEntity<User>): Promise<Pages<User>> {
    const { pi, ps, name, ids } = query || {}
    const findCondition: FindManyOptions<User> = {
      relations: ['roles'],
      where: {}
    }
    const page = isNaN(Number(pi)) ? 1 : Number(pi)
    const limit = isNaN(Number(ps)) ? 0 : Number(ps)

    if (limit > 0) {
      findCondition.skip = Math.abs(page - 1) * limit
      findCondition.take = limit
    }
    if (name && name.trim()) {
      findCondition.where['name'] = Like(`%${name.trim()}%`)
    }
    if (Array.isArray(ids) && ids.length) {
      findCondition.where['id'] = Not(In(ids))
    }
    const [data, count] = await this.repo.findAndCount(findCondition)
    return {
      data,
      count,
      page,
      limit
    }
  }

  validCreateUser(body: User) {
    if (!body?.account) {
      throw new HttpException('账号不能为空', 500)
    }

    if (!body?.name) {
      throw new HttpException('用户名不能为空', 500)
    }
  }

  async createOne(data: User) {
    this.validCreateUser(data)
    const user = new User()
    Object.keys(data).forEach(key => {
      user[key] = data[key]
    })
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()
    try {
      const res = await queryRunner.manager.save(User, user)
      if (user?.roles && user.roles.length > 0) {
        await queryRunner.manager
          .createQueryBuilder(User, 'u')
          .relation('roles')
          .of(res)
          .add(user.roles)
      }

      await queryRunner.commitTransaction()
      return res
    } catch (err: unknown) {
      await queryRunner.rollbackTransaction()

      throw new HttpException(
        {
          message: '新增用户失败，请检查参数或联系管理员',
          error: err.toString()
        },
        500
      )
    } finally {
      await queryRunner.release()
    }
  }

  async updateOne(id: string, body: User) {
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()
    try {
      /**新增默认用户管理员 */
      const { roles = [], ...arg } = body
      await this.repo.update(id, {
        ...arg,
        updateTime: new Date()
      })
      const { roles: r } = await this.repo.findOne({
        where: { id: Equal(id) },
        relations: ['roles']
      })
      if (r?.length) {
        await queryRunner.manager.createQueryBuilder(User, 'u').relation('roles').of(id).remove(r)
      }
      if (roles.length) {
        await queryRunner.manager.createQueryBuilder(User, 'u').relation('roles').of(id).add(roles)
      }

      return await queryRunner.commitTransaction()
    } catch (err: unknown) {
      await queryRunner.rollbackTransaction()
    } finally {
      await queryRunner.release()
    }
    throw new HttpException('更新USER失败，请检查参数或联系管理员', 500)
  }

  async deleteData(id: string | string[]) {
    const softDelete = this.config.getSoftDelete('user')
    return softDelete ? this.repo.softDelete(id) : this.repo.delete(id)
  }

  async getOne(id: string) {
    return this.repo
      .findOne({
        where: { id: Equal(id) },
        relations: ['roles']
      })
      .then(r => {
        if (r) {
          r.roles = r.roles?.map(k => k.id) as unknown as Role[]
        }
        return r
      })
  }

  updatePassword(id: string, password: string) {
    return this.repo.update(id, {
      password: CryptoUtil.encryptPassWord(password)
    })
  }

  async checkUserExists(account: string, id: string) {
    if (!account) {
      return null
    }
    if (id) {
      const user = await this.repo.findOneBy({ id })
      if (user?.account === account) {
        return null
      }
    }
    return this.repo.findOneBy({ account })
  }

  getRouterChoose(path: string) {
    const val = []
    this.acl.getRouters().forEach(r => {
      const ob = {
        title: r.name,
        selectable: false,
        expanded: false,
        key: r.name,
        children: []
      }
      r.data.forEach(d => {
        const md = this.acl.requestMethod[d.method].toUpperCase()
        ob.expanded = ob.expanded ? true : path === `${md}||${d.path}`
        ob.children.push({
          title: d.path,
          key: `${md}||${d.path}`,
          icon: 'api',
          isLeaf: true
        })
      })
      val.push(ob)
    })
    return val
  }
}
