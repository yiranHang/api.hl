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
  @Column({ type: 'varchar', nullable: true, comment: '备注' })
  remark!: string

  @TreeChildren()
  children!: Menu[]

  @TreeParent({ onDelete: 'CASCADE' })
  parent!: Menu

  @Column({ type: 'varchar', nullable: true, comment: '图标' })
  icon!: string

  @Column({ type: 'varchar', nullable: true, unique: true, comment: '路径' })
  link!: string

  @Column({ type: 'varchar', comment: '名称' })
  text!: string

  @Column({ type: 'boolean', default: false, comment: '是否显示面包屑' })
  hideInBreadcrumb!: string

  @Column({ type: 'boolean', comment: '是否禁用菜单', default: false })
  forbidden!: boolean

  @Column({ type: 'boolean', comment: '是否叶子菜单', default: false })
  isLeaf!: boolean

  @Column({ type: 'boolean', comment: '是否显示展开', default: false })
  showExpand!: boolean

  @Column({ type: 'int', comment: '序号' })
  sort!: number

  @OneToMany(() => Permission, p => p.menu, { nullable: true, cascade: true })
  permission!: Permission[]
}
