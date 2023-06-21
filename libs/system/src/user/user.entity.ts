import { BaseEntity } from '@admin-api/database'
import { BeforeInsert, Column, Entity, JoinTable, ManyToMany } from 'typeorm'

import { CryptoUtil } from '../system.util'
import { Role } from '../role/role.entity'
@Entity({
  orderBy: {
    createTime: 'DESC'
  }
})
export class User extends BaseEntity {
  @Column({ unique: true, type: 'varchar', comment: '账号' })
  account?: string

  @Column({ type: 'varchar', nullable: true, comment: '用户名' })
  name?: string

  @Column({
    type: 'int',
    enum: [0, 1],
    default: 1,
    comment: '账号状态(1:正常;0:冻结)'
  })
  status?: number

  @Column({
    type: 'varchar',
    comment: '密码',
    nullable: true
  })
  password?: string
  @BeforeInsert()
  hashPassword(): void {
    let password = '123456A!'
    if (this.account) {
      password = `${this.account.substring(this.account.length - 15)}@123`
    }
    this.password = CryptoUtil.encryptPassWord(password) as string
  }
  /**
   * @description: 用户密码连续输入错误次数超过5次，锁定账号
   */
  @Column({ default: 0, type: 'int', comment: '密码输入错误计数' })
  count?: number

  @Column({ type: 'varchar', comment: '单位', nullable: true })
  unit?: string

  @Column({ type: 'varchar', comment: '职位', nullable: true })
  position?: string

  @Column({ type: 'varchar', comment: '标识验证码', nullable: true })
  token?: string

  @Column({
    default: true, //false不需要重新设置密码
    comment: '新建还是重置',
    name: 'is_created_or_reset',
    type: 'boolean'
  })
  isCreatedOrReset?: boolean

  @Column({
    type: 'timestamptz',
    comment: '上一次修改密码的时间',
    name: 'password_change_time',
    nullable: true
  })
  passwordChangTime?: Date

  @Column({ type: 'timestamptz', comment: '冻结时间', name: 'freeze_time', nullable: true })
  freezeTime?: Date

  /**
   * 备注
   *
   * @type {string}
   * @memberof User
   */
  @Column({ nullable: true, comment: '备注' })
  remark?: string

  @ManyToMany(() => Role, { cascade: true })
  @JoinTable()
  roles?: Role[]
}
