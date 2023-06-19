import { BaseEntity } from '@admin-api/database'
import { Column, Entity, OneToMany, Tree, TreeChildren, TreeParent } from 'typeorm'
import { Permission } from '../permission/permission.entity'
@Entity({
  orderBy: {
    sort: 'ASC',
    createTime: 'DESC'
  }
})
@Tree('closure-table')
export class Menu extends BaseEntity {
  @Column({ type: 'varchar', unique: true, comment: '路由访问路径' })
  path?: string

  /** 对应页面组件 name, 可用作 KeepAlive 缓存标识 && 按钮权限筛选 */
  @Column({ type: 'varchar', comment: '路由 name ' })
  name!: string

  @Column({ type: 'varchar', nullable: true, comment: '路由重定向地址' })
  redirect!: string

  @Column({ type: 'varchar', nullable: true, comment: '视图文件路径' })
  component!: string

  @Column({ type: 'varchar', nullable: true, comment: '菜单和面包屑对应的图标' })
  icon!: string

  @Column({ type: 'varchar', comment: '路由标题 (用作 document.title || 菜单的名称)' })
  title!: string

  @Column({
    type: 'varchar',
    nullable: true,
    comment: '是否在菜单中隐藏, 需要高亮的 path (通常用作详情页高亮父级菜单)'
  })
  activeMenu!: string

  @Column({ type: 'varchar', nullable: true, comment: '路由外链时填写的访问地址' })
  isLink!: string

  @Column({ type: 'boolean', comment: '是否在菜单中隐藏 (通常列表详情页需要隐藏)', default: false })
  isHide!: boolean

  @Column({ type: 'boolean', comment: '菜单是否全屏 (示例：数据大屏页面)', default: false })
  isFull!: boolean

  @Column({ type: 'boolean', comment: '菜单是否固定在标签页中 (首页通常是固定项)', default: false })
  isAffix!: boolean

  @Column({ type: 'boolean', comment: '当前路由是否缓存', default: true })
  isKeepAlive!: boolean

  @Column({ type: 'int', comment: '序号' })
  sort!: number

  @Column({ type: 'boolean', comment: '是否叶子菜单', default: false })
  isLeaf!: boolean

  @TreeChildren()
  children?: Menu[]

  @TreeParent({ onDelete: 'CASCADE' })
  parent?: Menu

  @OneToMany(() => Permission, p => p.menu, { nullable: true, cascade: true })
  permission?: Permission[]
}
