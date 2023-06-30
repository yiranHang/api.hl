import { BaseEntity } from '@admin-api/database'
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm'
import { Menu } from '../menu/menu.entity'
@Entity({
  orderBy: {
    createTime: 'DESC',
    code: 'DESC'
  }
})
export class Permission extends BaseEntity {
  @Column({ type: 'varchar', comment: '权限名' })
  name?: string

  @Column({ type: 'varchar', comment: '权限代码' })
  code?: string

  @Column({
    type: 'varchar',
    nullable: true,
    enum: ['post', 'patch', 'get', 'delete'],
    comment: 'API请求头'
  })
  method?: string

  @Column({ type: 'varchar', nullable: true, comment: 'API请求地址' })
  path?: string

  @Column({ default: false, type: 'boolean', comment: '是否禁用' })
  forbidden?: boolean

  @ManyToOne(() => Menu, m => m.permission, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn()
  menu?: Menu

  @Column({ type: 'varchar', nullable: true, comment: '备注' })
  remark?: string
}
