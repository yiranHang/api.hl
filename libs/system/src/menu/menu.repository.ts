import { Menu } from './menu.entity'
import { TreeRepository } from 'typeorm'
import { BindRepository } from '@admin-api/database'

@BindRepository(Menu)
export class MenuRepository extends TreeRepository<Menu> {
  /**
   * 获取所有菜单权限点
   *
   * @returns
   */
  async getAclsAndMenu(validAcl: string[] = []) {
    const result = await this.findTrees({
      relations: ['permission']
    })
    let switchRouter = ''
    const getAcl = (link: string) => {
      return validAcl.includes(`${link}:get`) ? `${link}:get` : ''
    }

    const ergodicTree = (data: Menu[], root?: Menu) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const menus: any[] = []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const searchKey: any[] = []
      let ishasChildren = false
      const setAcls = (menu: Menu) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const permissions: any = {}
        const { permission, ...arg } = menu
        const {
          icon,
          title,
          activeMenu,
          isLink,
          isHide,
          isFull,
          isAffix,
          isKeepAlive,
          ...restarg
        } = arg
        permission?.forEach(p => {
          permissions[p.code as string] = `${menu.path}:${p.code}`
        })
        if (validAcl.includes(`${menu.path}:get`) && permissions['get']) {
          ishasChildren = true
          /**此处可根据配置决定跳转页 */
          switchRouter = switchRouter ? switchRouter : (menu.path as string)
          let path = menu.path

          searchKey.push({
            rootText: root?.title || '',
            rootId: root?.id || '',
            text: menu.title,
            path: path,
            id: menu.id
          })
        }
        menus.push({
          ...restarg,
          meta: { icon, title, activeMenu, isLink, isHide, isFull, isAffix, isKeepAlive },
          acl: { ability: [getAcl(menu.path as string)] },
          key: restarg.id
        })
      }
      data.forEach(d => {
        const { isLeaf, path, children, id } = d
        const isOk = isLeaf && path
        if (isOk) {
          setAcls(d)
        } else if (children?.length) {
          const { menus: m, ishasChildren: is, searchKey: sk } = ergodicTree(children, d)
          d.children = m
          ishasChildren = ishasChildren ? true : is
          const {
            icon,
            title,
            activeMenu,
            isLink,
            isHide,
            isFull,
            isAffix,
            isKeepAlive,
            ...restd
          } = d
          const arg: Record<string, unknown> = {
            ...restd,
            meta: { icon, title, activeMenu, isLink, isHide, isFull, isAffix, isKeepAlive },
            key: id
          }
          if (!is) {
            arg['acl'] = { ability: [''] }
          }
          searchKey.push(...sk)
          menus.push(arg)
        }
      })
      return { menus, ishasChildren, switchRouter, searchKey }
    }
    return ergodicTree(result)
  }
}
