import { BaseEntity } from '@admin-hl/database'
import { Type } from 'class-transformer'
import { Column, Entity, JoinTable, ManyToMany } from 'typeorm'
import { Permission } from '../permission/permission.entity'

@Entity({
  orderBy: {
    createTime: 'DESC'
  }
})
export class Role extends BaseEntity {
  @Column({
    type: 'varchar',
    comment: '角色名称'
  })
  name: string

  @Column({
    type: 'varchar',
    unique: true,
    comment: '角色代码'
  })
  code: string

  @Column({
    default: false,
    type: 'boolean',
    comment: '是否禁用'
  })
  forbidden: boolean

  @Column({
    type: 'varchar',
    nullable: true,
    comment: '角色详情描述'
  })
  remark: string

  @ManyToMany(() => Permission)
  @JoinTable()
  @Type(() => Permission)
  permissions: Permission[]
}
