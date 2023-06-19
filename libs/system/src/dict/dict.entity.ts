import { BaseEntity } from '@admin-api/database'
import { Column, Entity, OneToMany } from 'typeorm'
import { DictDetail } from './dict-detail.entity'
@Entity({
  orderBy: {
    createTime: 'DESC'
  }
})
export class Dict extends BaseEntity {
  @Column({ unique: true, type: 'varchar', comment: '字典唯一key' })
  key?: string

  @Column({ type: 'varchar', nullable: true, comment: '字典名称' })
  name?: string

  @Column({ default: false, type: 'boolean', comment: '是否禁用' })
  forbidden?: boolean

  /**
   * 备注
   *
   * @type {string}
   * @memberof User
   */
  @Column({ nullable: true, comment: '备注' })
  remark?: string

  @OneToMany(() => DictDetail, d => d.dict, { nullable: true })
  detail?: DictDetail[]
}
