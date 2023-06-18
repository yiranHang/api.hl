import { BaseEntity } from '@admin-hl/database'
import { Column, Entity } from 'typeorm'

@Entity({
  orderBy: {
    type: 'ASC',
    createTime: 'DESC'
  }
})
export class Documents extends BaseEntity {
  @Column({
    type: 'varchar',
    comment: '文件名称'
  })
  name?: string

  @Column({
    type: 'varchar',
    comment: '文件类型 '
  })
  type?: string

  @Column({
    type: 'int',
    nullable: true,
    comment: '文件大小'
  })
  size?: number

  @Column({
    type: 'varchar',
    comment: '文件资源路径'
  })
  path?: string

  @Column({
    type: 'varchar',
    comment: '是否是同一文件标识'
  })
  etag?: string
}
