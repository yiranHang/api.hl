import { Injectable, Logger } from '@nestjs/common'
import { ApplicationConfig } from '@nestjs/core'
import { EntityManager } from 'typeorm'
import { Menu } from './menu/menu.entity'
import { Permission } from './permission/permission.entity'
import { Role } from './role/role.entity'
import { User } from './user/user.entity'
import { ConfigService } from './core/service/config.service'
import { DataBaseSource, NoSafe } from '@admin-api/database'

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

  private getSystemParentEntity() {
    const menu = new Menu()
    menu.isLeaf = false
    menu.icon = 'Tools'
    menu.title = '系统管理'
    menu.name = 'system'
    menu.path = '/system'
    menu.redirect = '/system/userManage'
    menu.sort = 6
    return menu
  }

  private getDataScreenEntity() {
    const menu = new Menu()
    menu.isLeaf = true
    menu.icon = 'Histogram'
    menu.title = '数据大屏'
    menu.name = 'dataScreen'
    menu.path = '/dataScreen'
    menu.component = '/dataScreen/index'
    menu.isFull = true
    menu.isKeepAlive = true
    menu.sort = 2
    menu.permission = this.getBasePermission()
    return menu
  }

  private getHomeEntity() {
    const menu = new Menu()
    menu.isLeaf = true
    menu.icon = 'HomeFilled'
    menu.title = '首页'
    menu.name = 'home'
    menu.path = '/layout/home'
    menu.component = '/home/index'
    menu.isKeepAlive = true
    menu.sort = 1
    menu.permission = this.getBasePermission()
    return menu
  }

  private getAssemblyParentEntity() {
    const menu = new Menu()
    menu.isLeaf = false
    menu.icon = 'Briefcase'
    menu.title = '常用组件'
    menu.name = 'assembly'
    menu.path = '/assembly'
    menu.redirect = '/assembly/guide'
    menu.sort = 3
    return menu
  }

  private getFormParentEntity() {
    const menu = new Menu()
    menu.isLeaf = false
    menu.icon = 'Document'
    menu.title = '表单 Form'
    menu.name = 'form'
    menu.path = '/form'
    menu.redirect = '/form/proForm'
    menu.sort = 4
    return menu
  }

  private getEchartsParentEntity() {
    const menu = new Menu()
    menu.isLeaf = false
    menu.icon = 'TrendCharts'
    menu.title = 'Echarts'
    menu.name = 'echarts	'
    menu.path = '/echarts	'
    menu.redirect = '/echarts/waterChart'
    menu.sort = 5
    return menu
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
        component: '/system/userManage/index',
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

  private getAssemblyEntity() {
    return [
      {
        isLeaf: true,
        title: '引导页',
        path: '/assembly/guide',
        name: 'guide',
        icon: 'Menu',
        component: '/assembly/guide/index',
        sort: 1,
        permission: this.getBasePermission()
      },
      {
        isLeaf: true,
        title: '标签页操作',
        path: '/assembly/tabs',
        name: 'tabs',
        icon: 'Menu',
        component: '/assembly/tabs/index',
        sort: 2,
        permission: this.getBasePermission()
      },
      {
        isLeaf: true,
        title: '图标选择器',
        path: '/assembly/selectIcon',
        name: 'selectIcon',
        icon: 'Menu',
        component: '/assembly/selectIcon/index',
        sort: 3,
        permission: this.getBasePermission()
      },
      {
        isLeaf: true,
        title: '分类筛选器',
        path: '/assembly/selectFilter',
        name: 'selectFilter',
        icon: 'Menu',
        component: '/assembly/selectFilter/index',
        sort: 4,
        permission: this.getBasePermission()
      },
      {
        isLeaf: true,
        title: 'SVG 图标',
        path: '/assembly/svgIcon',
        name: 'svgIcon',
        icon: 'Menu',
        component: '/assembly/svgIcon/index',
        sort: 5,
        permission: this.getBasePermission()
      },
      {
        isLeaf: true,
        title: '文件上传',
        path: '/assembly/uploadFile',
        name: 'uploadFile',
        icon: 'Menu',
        component: '/assembly/uploadFile/index',
        sort: 6,
        permission: this.getBasePermission()
      },
      {
        isLeaf: true,
        title: '批量添加数据',
        path: '/assembly/batchImport',
        name: 'batchImport',
        icon: 'Menu',
        component: '/assembly/batchImport/index',
        sort: 7,
        permission: this.getBasePermission()
      },
      {
        isLeaf: true,
        title: '富文本编辑器',
        path: '/assembly/wangEditor',
        name: 'wangEditor',
        icon: 'Menu',
        component: '/assembly/wangEditor/index',
        sort: 8,
        permission: this.getBasePermission()
      },
      {
        isLeaf: true,
        title: '拖拽组件',
        path: '/assembly/draggable',
        name: 'draggable',
        icon: 'Menu',
        component: '/assembly/draggable/index',
        sort: 9,
        permission: this.getBasePermission()
      }
    ]
  }

  private getFormEntity() {
    return [
      {
        isLeaf: true,
        title: '超级 Form',
        path: '/form/proForm',
        name: 'proForm',
        icon: 'Menu',
        component: '/form/proForm/index',
        sort: 1,
        permission: this.getBasePermission()
      }
    ]
  }

  private getEchartsEntity() {
    return [
      {
        isLeaf: true,
        title: '水型图',
        path: '/echarts/waterChart',
        name: 'waterChart',
        icon: 'Menu',
        component: '/echarts/waterChart/index',
        sort: 1,
        permission: this.getBasePermission()
      },
      {
        isLeaf: true,
        title: '柱状图',
        path: '/echarts/columnChart',
        name: 'columnChart',
        icon: 'Menu',
        component: '/echarts/columnChart/index',
        sort: 1,
        permission: this.getBasePermission()
      },
      {
        isLeaf: true,
        title: '折线图',
        path: '/echarts/lineChart',
        name: 'lineChart',
        icon: 'Menu',
        component: '/echarts/lineChart/index',
        sort: 1,
        permission: this.getBasePermission()
      },
      {
        isLeaf: true,
        title: '饼图',
        path: '/echarts/pieChart',
        name: 'pieChart',
        icon: 'Menu',
        component: '/echarts/pieChart/index',
        sort: 1,
        permission: this.getBasePermission()
      },
      {
        isLeaf: true,
        title: '雷达图',
        path: '/echarts/radarChart',
        name: 'radarChart',
        icon: 'Menu',
        component: '/echarts/radarChart/index',
        sort: 1,
        permission: this.getBasePermission()
      },
      {
        isLeaf: true,
        title: '嵌套环形图',
        path: '/echarts/nestedChart',
        name: 'nestedChart',
        icon: 'Menu',
        component: '/echarts/nestedChart/index',
        sort: 1,
        permission: this.getBasePermission()
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
    role: Role,
    mu: Partial<Menu> & { url: string },
    me?: Menu
  ) {
    const permissions: Permission[] = []
    for (const key of mu.permission as Permission[]) {
      const permission = new Permission()
      permission.name = key.name
      permission.code = key.code
      permission.menu = me ? me : (mu as Menu)
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

  async setMenu(manager: EntityManager, me: Menu, menus: Menu[], role: Role) {
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
      await this.setPermission(manager, role, mu as Partial<Menu> & { url: string }, m)
    }
  }

  async setParentMenu(manager: EntityManager, menu: Menu) {
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
      .catch((r: NoSafe) => {})
    if (!user) {
      await queryRunner.connect()
      await queryRunner.startTransaction()
      try {
        /**新增默认用户管理员 */
        const user = await this.setUser(queryRunner.manager)
        const role = await this.setRole(queryRunner.manager)

        /**管理用户和角色，添加关联关系 */
        await queryRunner.manager.createQueryBuilder(User, 'u').relation('roles').of(user).add(role)

        /**新增默认 首页 菜单 */
        const homeParent = this.getHomeEntity()
        const homeMenu = await this.setParentMenu(queryRunner.manager, homeParent)
        await this.setPermission(
          queryRunner.manager,
          role,
          homeMenu as Partial<Menu> & { url: string }
        )

        /**新增默认 数据大屏 菜单 */
        const dataScreenParent = this.getDataScreenEntity()
        const dataScreenMenu = await this.setParentMenu(queryRunner.manager, dataScreenParent)
        await this.setPermission(
          queryRunner.manager,
          role,
          dataScreenMenu as Partial<Menu> & { url: string }
        )

        /**新增默认系统管理-菜单管理 */
        const systemParent = this.getSystemParentEntity()
        const systemChildren = this.getSystemEntity() as unknown as Menu[]
        const systemMenu = await this.setParentMenu(queryRunner.manager, systemParent)
        await this.setMenu(queryRunner.manager, systemMenu, systemChildren, role)

        /**新增默认 常用组件 菜单 */
        const assemblyParent = this.getAssemblyParentEntity()
        const assemblyChildren = this.getAssemblyEntity() as unknown as Menu[]
        const assemblyMenu = await this.setParentMenu(queryRunner.manager, assemblyParent)
        await this.setMenu(queryRunner.manager, assemblyMenu, assemblyChildren, role)

        /**新增默认 form 菜单 */
        const formParent = this.getFormParentEntity()
        const formChildren = this.getFormEntity() as unknown as Menu[]
        const formMenu = await this.setParentMenu(queryRunner.manager, formParent)
        await this.setMenu(queryRunner.manager, formMenu, formChildren, role)

        /**新增默认 echarts 菜单 */
        const echartsParent = this.getEchartsParentEntity()
        const echartsChildren = this.getEchartsEntity() as unknown as Menu[]
        const echartsMenu = await this.setParentMenu(queryRunner.manager, echartsParent)
        await this.setMenu(queryRunner.manager, echartsMenu, echartsChildren, role)

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
