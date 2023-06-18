import { Menu } from './menu.entity'
import { TreeRepository } from 'typeorm'
import { BindRepository } from '@admin-hl/database'

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
      const menus: Record<string, unknown>[] = []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const searchKey: any[] = []
      let ishasChildren = false
      const setAcls = (menu: Menu) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const permissions: any = {}
        const { permission, ...arg } = menu
        permission.forEach(p => {
          permissions[p.code] = `${menu.link}:${p.code}`
        })
        if (validAcl.includes(`${menu.link}:get`) && permissions['get']) {
          ishasChildren = true
          /**此处可根据配置决定跳转页 */
          switchRouter = switchRouter ? switchRouter : menu.link
          let link = menu.link
          if (menu.remark === '1') {
            link = menu.icon + menu.link
          }
          searchKey.push({
            rootText: root?.text || '',
            rootId: root?.id || '',
            text: menu.text,
            link: link,
            id: menu.id
          })
        }
        menus.push({
          ...arg,
          acl: { ability: [getAcl(menu.link)] },
          key: arg.id
        })
      }
      data.forEach(d => {
        const { isLeaf, link, children, id } = d
        const isOk = isLeaf && link
        if (isOk) {
          setAcls(d)
        } else if (children.length) {
          const { menus: m, ishasChildren: is, searchKey: sk } = ergodicTree(children, d)
          d.children = m
          ishasChildren = ishasChildren ? true : is
          const arg: Record<string, unknown> = {
            ...d,
            key: id
          }
          if (!is) {
            arg.acl = { ability: [''] }
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
