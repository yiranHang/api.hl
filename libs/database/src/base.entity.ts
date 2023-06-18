import {
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm'
export class BaseEntity {
  @PrimaryGeneratedColumn('uuid', { comment: '主键编码' })
  id?: string

  @CreateDateColumn({ type: 'timestamptz', name: 'create_time', comment: '创建时间' })
  createTime?: Date

  @DeleteDateColumn({
    type: 'timestamptz',
    comment: '删除时间',
    name: 'delete_time',
    nullable: true,
    select: false
  })
  deletedTime?: Date

  @UpdateDateColumn({ type: 'timestamptz', name: 'update_time', comment: '更改时间' })
  updateTime?: Date
}
