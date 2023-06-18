import { BaseEntity } from '@admin-api/database'
import { Column, Entity, Index } from 'typeorm'
import { NoSafe } from './logger.interface'

@Entity({
  orderBy: {
    type: 'ASC',
    createTime: 'DESC'
  }
})
export class Logger extends BaseEntity {
  @Column({ type: 'varchar', nullable: true, comment: '请求ip' })
  ip?: string

  @Column({ type: 'varchar', nullable: true, comment: '来源某个请求地址' })
  from?: string

  /**
   * 日志内容
   *
   * @type {NoSafe}
   * @memberof Logger
   */
  @Column({ type: 'simple-json', nullable: true, comment: '输入详细信息' })
  input?: NoSafe
  /**
   * 日志分类
   *
   * @type {string}
   * @memberof Logger
   */
  @Index()
  @Column({
    type: 'varchar',
    nullable: true,
    enum: ['exception', 'login', 'add', 'update', 'delete', 'other'],
    default: 'other',
    comment: '日志分类'
  })
  category?: string

  // @ManyToOne(() => User)
  // @JoinColumn()
  // operator?: User;
}
