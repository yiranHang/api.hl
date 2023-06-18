import { HttpException, Injectable } from '@nestjs/common'
import { EntityManager, Equal, FindManyOptions, IsNull } from 'typeorm'
import { UserRepository } from '../user/user.repository'
import { MenuRepository } from './menu.repository'
import { Menu } from './menu.entity'
import { Pages, QueryEntity } from '../system.type'
import { ConfigService } from '../core/service/config.service'
import { Permission } from '../permission/permission.entity'
import { DataBaseSource } from '@admin-hl/database'

@Injectable()
export class MenuService {
  constructor(
    readonly repository: MenuRepository,
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
    const data = await this.repository.findTrees({
      relations: ['permission']
    })
    const ergodicTree = (data: Menu[]) => {
      const menus = []
      const setMenu = (d: Menu) => {
        if (d.children.length) {
          menus.push({
            key: d.id,
            title: d.text,
            isDisabled: d.forbidden,
            isLeaf: false,
            children: d.children
          })
        }
      }
      const setPermission = (menu: Menu) => {
        menu.children = menu.permission.map(k => {
          return {
            key: k?.['id'],
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
        } else if (d.children.length) {
          d.children = ergodicTree(d.children)
          setMenu(d)
        }
      })
      return menus
    }
    return ergodicTree(data)
  }

  /**
   * 根据用户ID 获取该用户的 ROLE,acl,menus
   *
   * @param id 用户ID
   * @returns
   */
  async getRoleMenuAclByUser(id: string) {
    if (!id) {
      throw new HttpException('获取权限点必须含有id', 401)
    }

    /**获取用户本身权限点、角色 */
    const { role: r, ability: a } = await this.userRepository.getRoleAbilityApiById(id)

    const roles = [...new Set([...r])]
    const abilities = [...new Set([...a])]
    /**获取所有菜单权限点,和有效菜单 */
    const { menus, ishasChildren, switchRouter, searchKey } = await this.repository.getAclsAndMenu(
      abilities
    )
    return {
      roles,
      abilities,
      menus,
      switchRouter,
      searchKey,
      hasMenu: roles.includes(this.config.defaultRole) ? true : ishasChildren
    }
  }

  // 根据userID获取菜单
  async getMenubyUser(id: string) {
    if (!id) {
      throw new HttpException('获取权限点必须含有id', 401)
    }
    const { roles } = await this.getRoleMenuAclByUser(id)
    const menus = await this.repository.getAclsAndMenu(roles)
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
    const [data, count] = await this.repository.findAndCount(findCondition)
    return {
      data,
      count,
      page: Number(pi),
      limit: Number(ps)
    }
  }

  async getOne(id: string) {
    return this.repository
      .findOne({
        where: { id },
        relations: ['children']
      })
      .then(r => {
        if (Array.isArray(r?.children) && r.children.length) {
          r['hideLeaf'] = true
        }
        if (!r?.permission) {
          r['permission'] = []
        }
        return r
      })
  }

  validCreateMenu(body: Menu) {
    if (!body?.text) {
      throw new HttpException('菜单名称不能为空', 500)
    }
    if (!body?.sort) {
      throw new HttpException('菜单序号不能为空', 500)
    }
    if (body?.isLeaf) {
      if (!body?.link) {
        throw new HttpException('叶子菜单，地址不能为空', 500)
      }
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
    this.validCreateMenu(body)
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()
    try {
      const { parent, ...data } = body
      const menu = new Menu()
      menu.text = data.text
      menu.sort = data.sort
      if (data.isLeaf) {
        menu.link = data.link
      }
      menu.isLeaf = data.isLeaf
      menu.showExpand = !data.isLeaf
      menu.icon = data.icon || null
      menu.forbidden = data.forbidden
      menu.hideInBreadcrumb = data.hideInBreadcrumb
      menu.remark = data.remark
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
      delete body['hideLeaf']
      return this.repository.update(id, {
        ...body,
        updateTime: new Date()
      })
    }
  }

  async deleteData(id: string | string[]) {
    return this.repository.delete(id)
  }

  async checkLinkExists(link: string, id: string) {
    if (!link) {
      return null
    }
    if (id) {
      const menu = await this.repository.findOneBy({ id })
      if (menu?.link === link) {
        return null
      }
    }
    return this.repository.findOneBy({ link })
  }

  getListSearch(name: string) {
    if (!name?.trim()) {
      return []
    }
  }
}
