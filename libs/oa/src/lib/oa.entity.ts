import { BaseEntity } from '@admin-api/database'
import { User } from '@admin-hl/system'
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
@Entity({
  orderBy: {
    createTime: 'DESC'
  }
})
export class Oa extends BaseEntity {
  @Index()
  @Column({
    type: 'varchar',
    comment: 'oa 生成的token'
  })
  token: string

  @Column({
    type: 'varchar',
    nullable: true,
    comment: '当前使用的密钥'
  })
  sercet: string

  @Column({
    type: 'varchar',
    nullable: true,
    comment: '对应type值'
  })
  type: string

  @Column({
    default: false,
    type: 'boolean',
    comment: '该token 是否已经被使用'
  })
  use?: boolean

  @Column({
    type: 'int',
    enum: [0, 1, 2],
    default: 0,
    comment: '当前token解析结果0 未使用  1 成功 2 失败'
  })
  result?: number

  @Column({
    type: 'varchar',
    nullable: true,
    comment: '解析失败原因'
  })
  msg?: string

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn()
  user?: User
}
