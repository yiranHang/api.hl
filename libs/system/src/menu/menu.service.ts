import { HttpException, Injectable, UnauthorizedException } from '@nestjs/common'
import { EntityManager, Equal, FindManyOptions, IsNull } from 'typeorm'
import { UserRepository } from '../user/user.repository'
import { MenuRepository } from './menu.repository'
import { Menu } from './menu.entity'
import { Pages, QueryEntity } from '../system.type'
import { ConfigService } from '../core/service/config.service'
import { Permission } from '../permission/permission.entity'
import { DataBaseSource, NoSafe } from '@admin-api/database'
import { flatten, groupBy } from 'underscore'
import { User } from '../user/user.entity'

@Injectable()
export class MenuService {
  constructor(
    readonly repo: MenuRepository,
    private config: ConfigService,
    private userRepository: UserRepository,
    private dataSource: DataBaseSource
  ) {}

  private getPage(pi: number, ps: number) {
    const page = isNaN(Number(pi)) ? 1 : Number(pi)
    const limit = isNaN(Number(ps)) ? 0 : Number(ps)
    if (limit > 0) {
      return {
        skip: Math.abs(page - 1) * limit,
        take: limit
      }
    }
    return {}
  }

  async getPermissionTree() {
    const data = await this.repo.findTrees({
      relations: ['permission']
    })
    const ergodicTree = (data: Menu[]) => {
      const menus: NoSafe[] = []
      const setMenu = (d: Menu) => {
        if (d.children?.length) {
          menus.push({
            key: d.id,
            title: d.title,
            isLeaf: false,
            children: d.children
          })
        }
      }
      const setPermission = (menu: Menu) => {
        menu.children = menu.permission?.map(k => {
          return {
            key: k.id,
            title: k.name,
            isDisabled: false,
            isLeaf: true
          }
        }) as unknown as Menu[]
        setMenu(menu)
      }
      data.forEach(d => {
        if (d.isLeaf) {
          setPermission(d)
        } else if (d.children?.length) {
          d.children = ergodicTree(d.children)
          setMenu(d)
        }
      })
      return menus
    }
    return ergodicTree(data)
  }

  // 根据userID获取菜单
  async getMenubyUser(id: string) {
    if (!id) {
      throw new HttpException('获取权限点必须含有id', 401)
    }
    const { roles } = await this.getRoleMenuAclByUser(id)
    const menus = await this.repo.getAclsAndMenu(roles)
    return menus
  }

  async getMany(query: QueryEntity<Menu>): Promise<Pages<Menu>> {
    const { pi, ps, parent } = query || {}
    const pages = this.getPage(pi, ps)
    const findCondition: FindManyOptions<Menu> = {
      ...pages
    }
    const sign = String(parent) === 'null' ? null : parent
    findCondition.where = {
      parent: sign ? Equal(sign) : IsNull()
    }
    const [data, count] = await this.repo.findAndCount(findCondition)
    return {
      data,
      count,
      page: Number(pi),
      limit: Number(ps)
    }
  }

  async getManyList() {
    return await this.repo.findTrees()
  }

  async getOne(id: string) {
    return this.repo
      .findOne({
        where: { id },
        relations: ['children']
      })
      .then(r => {
        if (r && !r?.permission) {
          r['permission'] = []
        }
        return r
      })
  }

  async validCreateMenu(body: Menu) {
    if (!body?.title) {
      throw new HttpException('菜单名称不能为空', 500)
    }
    if (!body?.sort) {
      throw new HttpException('菜单序号不能为空', 500)
    }
    if (body?.isLeaf) {
      if (!body?.path) {
        throw new HttpException('叶子菜单，地址不能为空', 500)
      }
    }
    const menus = (await this.repo.createQueryBuilder('role').withDeleted().getMany())?.map(
      ({ name, path }) => ({ name, path })
    )
    const findPath = menus.find(({ path }) => path === body.path)
    const findName = menus.find(({ name }) => name === body.name)
    if (findPath) {
      throw new HttpException('路由访问路径已存在', 500)
    }
    if (findName) {
      throw new HttpException('路由 name 已存在', 500)
    }
  }

  async insertPermission(manager: EntityManager, menu: Menu, permission?: Permission[]) {
    const permissions = []
    const permissionArray = permission ? permission : this.config.crudAuthority
    for (const per of permissionArray) {
      const perm = new Permission()
      perm.code = per.code
      perm.name = per.name
      perm.method = per.method || ''
      perm.path = '*'
      perm.menu = menu
      permissions.push(perm)
    }
    const ps = await manager.save(Permission, permissions)
    /**角色绑定权限 */
    if (ps && ps.length) {
      await manager.createQueryBuilder(Menu, 'm').relation('permission').of(menu).add(ps)
    }
  }

  async createOne(body: Menu) {
    await this.validCreateMenu(body)
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()
    try {
      const { parent, ...data } = body
      const menu = new Menu()
      Object.assign(menu, data)
      if (parent) {
        const par = new Menu()
        par.id = parent as unknown as string
        menu.parent = par
      }
      const mn = await queryRunner.manager.save(menu)
      if (data.isLeaf) {
        await this.insertPermission(queryRunner.manager, mn)
      }
      await queryRunner.commitTransaction()
      return mn
    } catch (err: unknown) {
      await queryRunner.rollbackTransaction()
    } finally {
      await queryRunner.release()
    }
    throw new HttpException('新增MENU失败，请检查参数或联系管理员', 500)
  }

  async updateOne(id: string, body: Menu) {
    if (body && Object.keys(body).length) {
      delete body.children
      delete body.permission
      return await this.repo.update(id, {
        ...body,
        updateTime: new Date()
      })
    }
    return null
  }

  async deleteData(id: string | string[]) {
    return await this.repo.delete(id)
  }

  async checkPathExists(path: string, id: string) {
    if (!path) {
      return null
    }
    if (id) {
      const menu = await this.repo.findOneBy({ id })
      if (menu?.path === path) {
        return null
      }
    }
    return await this.repo.findOneBy({ path })
  }

  getListSearch(name: string) {
    if (!name?.trim()) {
      return []
    }
    return []
  }

  /**
   * 根据用户ID 获取该用户的 ROLE,acl,menus
   * @param id 用户ID
   * @returns
   */
  async getRoleMenuAclByUser(id: string) {
    type TreeOption = {
      roleCode: string
      path: string
      acl: string
      code: string
    }
    type Acl<T> = {
      [key: string]: T
    }
    const getAcl = (data: TreeOption[]) => {
      const record = groupBy(data, 'roleCode')
      const val: Acl<{ [key: string]: string }> = {}
      Object.keys(record).map(k => {
        const path = groupBy(record[k], 'path')
        Object.keys(path).map(s => {
          if (!Object.is(s, 'null')) {
            val[s] = {}
            path[s].map((z: TreeOption) => {
              val[s][z.code] = z.acl
            })
          }
        })
      })
      return { roles: Object.keys(record).filter(r => !Object.is(r, 'null')), acl: val }
    }
    const data = (
      await this.dataSource
        .getRepository(User)
        .createQueryBuilder('u')
        .select('role.code', 'roleCode')
        .addSelect('role.forbidden', 'forbidden')
        .addSelect('menu.path', 'path')
        .addSelect('permissions.code', 'code')
        .addSelect(`menu.path||':'||permissions.code`, 'acl')
        .leftJoin('u.roles', 'role')
        .leftJoin('role.permissions', 'permissions')
        .leftJoin('permissions.menu', 'menu')
        .where('u.id=:id', { id })
        .getRawMany()
    ).filter(r => !r.forbidden)
    const acl = Object.keys(groupBy(data, 'acl'))
    const menu = await this.getTreeMenus(acl)
    // if (!menu || !menu.length) {
    //   throw new UnauthorizedException('您当前账号没有权限访问该平台')
    // }
    const ra = getAcl(data)

    return { menu, ...ra }
  }

  private async getTreeMenus(acl: string[]) {
    const processTree = (v: Menu[]) => {
      /**是叶子节点 */
      const result = []
      for (const item of v) {
        const { isLeaf, permission, children } = item || {}
        const { icon, title, isLink, isHide, isFull, isAffix, isKeepAlive, ...restItem } =
          item || {}
        const menu: NoSafe = {
          meta: { icon, title, isLink, isHide, isFull, isAffix, isKeepAlive },
          ...restItem
        }
        if (isLeaf && permission?.length) {
          const isOk = permission.some(p => acl.includes(`${p?.menu?.path}:get`))
          delete menu.permission
          if (isOk) {
            result.push(menu)
            continue
          }
        }
        if (!isLeaf && children?.length) {
          const record = processTree(children)
          if (record.length > 0) {
            menu.children = record.sort((pre, nxt) => {
              return pre.sort - nxt.sort
            })
            result.push({ ...menu })
          }
          continue
        }
      }
      return result.sort((pre, nxt) => {
        return pre.sort - nxt.sort
      })
    }
    const data = await this.dataSource.getTreeRepository(Menu).findTrees({
      relations: ['permission', 'permission.menu']
    })
    return processTree(data)
  }
}
