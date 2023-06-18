import { BaseEntity } from '@admin-api/database'
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm'
import { Dict } from './dict.entity'
@Entity({
  orderBy: {
    sort: 'ASC',
    createTime: 'DESC'
  }
})
export class DictDetail extends BaseEntity {
  @Column({
    type: 'varchar',
    comment: '展示标签'
  })
  label: string

  @Column({
    type: 'int',
    comment: '排序'
  })
  sort: number

  @Column({
    type: 'varchar',
    comment: '展示值（默认都是string）'
  })
  value: string

  @Column({
    default: false,
    type: 'boolean',
    comment: '是否禁用'
  })
  disabled: boolean

  @Column({
    default: false,
    type: 'boolean',
    comment: '是否隐藏该项'
  })
  hide: boolean

  /**
   * 备注
   *
   * @type {string}
   * @memberof User
   */
  @Column({ nullable: true, comment: '备注' })
  remark: string

  @ManyToOne(() => Dict, d => d.detail, { onDelete: 'CASCADE' })
  @JoinColumn()
  dict: Dict[]
}
