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
        title: '菜单管理',
        name: 'menuManage',
        path: this.getLink('menuManage'),
        url: '/menu',
        icon: 'Menu',
        component: '/system/menuManage/index',
        sort: 3,
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
        title: '用户管理',
        path: this.getLink('userManage'),
        url: '/user',
        name: 'userManage',
        icon: 'Menu',
        component: '/system/accountManage/index',
        sort: 1,
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
        title: '角色管理',
        path: this.getLink('roleManage'),
        url: '/role',
        name: 'roleManage',
        icon: 'Menu',
        component: '/system/roleManage/index',
        sort: 2,
        permission: this.getBasePermission()
      },
      {
        isLeaf: true,
        title: '字典管理',
        path: this.getLink('dictManage'),
        url: '/dict',
        name: 'dictManage',
        icon: 'Menu',
        component: '/system/dictManage/index',
        sort: 5,
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
   * @Date: 2022-06-01 16:47:16
   * @param {string} path
   * @return {*}
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
    mu: Partial<Menu> & { url: string },
    role: Role
  ) {
    const permissions: Permission[] = []
    for (const key of mu.permission as Permission[]) {
      const permission = new Permission()
      permission.name = key.name
      permission.code = key.code
      permission.menu = me
      permission.path = this.getCompletePath(key.path || `${mu.url}/:id`)
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
      men.name = mu.name
      men.path = mu.path
      men.title = mu.title
      men.icon = mu.icon
      men.component = mu.component
      men.sort = mu.sort
      men.parent = me
      const m = await manager.save(Menu, men)
      await this.setPermission(manager, m, mu as Partial<Menu> & { url: string }, role)
    }
  }

  async setParentMenu(manager: EntityManager) {
    const menu = new Menu()
    menu.isLeaf = false
    menu.icon = 'Tools'
    menu.title = '系统管理'
    menu.name = 'system'
    menu.path = '/system'
    menu.redirect = '/system/userManage'
    menu.sort = 1
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
