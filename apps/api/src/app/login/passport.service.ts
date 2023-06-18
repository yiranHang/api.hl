import { Injectable } from '@nestjs/common'
import { DictRepository, UserService } from '@admin-api/system'
import { Equal, Like } from 'typeorm'

@Injectable()
export class PassPortService {
  constructor(private readonly user: UserService, private dict: DictRepository) {}

  async loginByPass(data: string) {
    return this.user.loginByPass(data)
  }

  /**
   * 该方法获取需要生成token的用户信息
   * 一般返回字符串，如用户id,账号等
   * @param id
   * @returns
   */
  async getOaToken(id: string) {
    const { account } = (await this.user.getOne(id)) || {}
    //TODO 假如没有获取到账号该怎么办
    return account
  }

  /**此处结合字典表获取协同账号配置不可动
   * @returns
   */
  async getOaSecretInfo() {
    const result = {} as Record<string, string[]>
    const dict = await this.dict.find({
      where: {
        key: Like(`coord-%`),
        forbidden: Equal(true)
      },
      relations: ['detail']
    })
    console.log(dict)
    ;(dict || []).forEach(r => {
      result[r.key] = r.detail.map(k => k.value)
    })
    return result
  }

  async format(account: string) {
    return {
      code: 1,
      msg: 'success',
      data: {
        account
      }
    }
  }
}
