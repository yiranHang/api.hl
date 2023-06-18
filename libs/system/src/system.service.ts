import { Injectable, Logger } from '@nestjs/common'
import { ApplicationConfig } from '@nestjs/core'
import { EntityManager } from 'typeorm'
import { Menu } from './menu/menu.entity'
import { Permission } from './permission/permission.entity'
import { Role } from './role/role.entity'
import { User } from './user/user.entity'
import { ConfigService } from './core/service/config.service'
import { DataBaseSource } from '@admin-api/database'

@Injectable()
export class SystemService {
  constructor(
    private dataSource: DataBaseSource,
    private config: ConfigService,
    private app: ApplicationConfig
  ) {}

  private getBasePermission() {
    return this.config?.crudAuthority
  }

  private getLink(path: string) {
    const { rootName } = this.config.initialize
    return `/${rootName}/${path}`
  }

  private getSystemEntity() {
    return [
      {
        isLeaf: true,
        text: '菜单管理',
        link: this.getLink('menu'),
        path: '/menu',
        sort: 3,
        remark: '菜单管理',
        permission: [
          ...this.getBasePermission(),
          {
            method: 'get',
            code: 'permission_get',
            name: '权限查看',
            path: '/permission'
          },
          {
            method: 'patch',
            code: 'permission_patch',
            name: '权限修改',
            path: '/permission/:id'
          },
          {
            method: 'post',
            code: 'permission_post',
            name: '新增权限',
            path: '/permission'
          },
          {
            method: 'post',
            code: 'permission_delete',
            name: '权限删除',
            path: '/permission/delete'
          }
        ]
      },
      {
        isLeaf: true,
        text: '用户管理',
        link: this.getLink('user'),
        path: '/user',
        sort: 1,
        remark: '用户管理',
        permission: [
          ...this.getBasePermission(),
          {
            method: 'patch',
            code: 'update_password',
            name: '密码修改',
            path: '/user/password/:id'
          },
          {
            method: 'get',
            code: 'acl_get',
            name: '查看权限',
            path: '/permission/acl/router'
          },
          {
            method: 'post',
            code: 'acl_config',
            name: '配置权限',
            path: '/permission/update'
          }
        ]
      },
      {
        isLeaf: true,
        text: '角色管理',
        link: this.getLink('role'),
        path: '/role',
        sort: 2,
        remark: '角色管理',
        permission: this.getBasePermission()
      },

      {
        isLeaf: true,
        text: '字典管理',
        link: this.getLink('dict'),
        path: '/dict',
        sort: 5,
        remark: '字典管理',
        permission: [
          ...this.getBasePermission(),
          {
            method: 'post',
            code: 'add_detail',
            name: '新增详情',
            path: '/dict/detail/one'
          },
          {
            method: 'post',
            code: 'detail_handle',
            name: '详情操作',
            path: '/dict/detail/one'
          }
        ]
      }
    ]
  }

  /**
   * @description:
   * @admin-api/author: dailiang
   * @Date: 2022-06-01 16:47:16
   * @param {string} path
   * @return {*}
   * @LastEditors: dailiang
   */
  private getCompletePath(path: string): string {
    const pathArr = (path: string) => {
      return path ? path.split('/').filter(f => f) : []
    }
    const prefix = this.app.getGlobalPrefix()
    const route = pathArr(prefix).concat(pathArr(path))
    return `/${route.join('/')}`
  }

  async setPermission(
    manager: EntityManager,
    me: Menu,
    mu: Partial<Menu> & { path: string },
    role: Role
  ) {
    const permissions: Permission[] = []
    for (const key of mu.permission as Permission[]) {
      const permission = new Permission()
      permission.name = key.name
      permission.code = key.code
      permission.menu = me
      permission.path = this.getCompletePath(key.path || `${mu.path}/:id`)
      permission.method = key.method
      permissions.push(permission)
    }
    const ps = await manager.save(Permission, permissions)
    /**角色绑定权限 */
    if (ps && ps.length) {
      await manager.createQueryBuilder(Role, 'r').relation('permissions').of(role).add(ps)
    }
  }

  async setMenu(manager: EntityManager, me: Menu, role: Role) {
    const menus = this.getSystemEntity()
    for (const mu of menus) {
      const men = new Menu()
      men.isLeaf = mu.isLeaf
      men.showExpand = !mu.isLeaf
      men.text = mu.text
      men.sort = mu.sort
      men.link = mu.link
      men.remark = mu.remark
      men.parent = me
      const m = await manager.save(Menu, men)
      await this.setPermission(manager, m, mu as Partial<Menu> & { path: string }, role)
    }
  }

  async setParentMenu(manager: EntityManager) {
    const menu = new Menu()
    menu.isLeaf = false
    menu.showExpand = true
    menu.icon = 'anticon-setting'
    menu.text = '系统管理'
    menu.sort = 1
    menu.remark = '系统管理'
    return manager.save(Menu, menu)
  }

  async setRole(manager: EntityManager) {
    const role = new Role()
    role.code = this.config.defaultRole
    role.name = '超级管理员'
    role.remark = '超级管理员的角色'
    return manager.save(Role, role)
  }

  async setUser(manager: EntityManager) {
    const user = new User()
    user.account = this.config.defaultAccount
    user.password = this.config.defaultAccount
    user.name = '超级管理员'
    return manager.save(User, user)
  }

  async initializeDb() {
    const queryRunner = this.dataSource.createQueryRunner()
    const user = await this.dataSource
      .getRepository(User)
      .findOneBy({
        account: this.config.defaultAccount
      })
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, no-empty-function, @typescript-eslint/no-empty-function
      .catch((r: any) => {})
    if (!user) {
      await queryRunner.connect()
      await queryRunner.startTransaction()
      try {
        /**新增默认用户管理员 */
        const user = await this.setUser(queryRunner.manager)
        const role = await this.setRole(queryRunner.manager)

        /**管理用户和角色，添加关联关系 */
        await queryRunner.manager.createQueryBuilder(User, 'u').relation('roles').of(user).add(role)

        /**新增默认系统管理-菜单管理 */
        const parentMenu = await this.setParentMenu(queryRunner.manager)
        await this.setMenu(queryRunner.manager, parentMenu, role)

        await queryRunner.commitTransaction()
      } catch (err: unknown) {
        await queryRunner.rollbackTransaction()
      } finally {
        await queryRunner.release()
      }
    }
    Logger.log('+++++++++++++++++++++++++初始化成功++++++++++++++++++++')
  }
}
