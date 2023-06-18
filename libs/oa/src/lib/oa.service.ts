import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common'
import { CONFIG, ContentOption, OAOption } from './type'
import { SM4 } from 'gm-crypto'
import { OaRepository } from './oa.repository'
import { Oa } from './oa.entity'
@Injectable()
export class OaService {
  constructor(@Inject(CONFIG) private option: OAOption, private oa: OaRepository) {}

  /**
   * SM4 加密
   */
  sm4Encrypt<T = unknown>(val: ContentOption<T>, key: string) {
    if (!key || key.length !== 32) {
      throw new HttpException('错误的密钥，请联系管理员', HttpStatus.INTERNAL_SERVER_ERROR)
    }
    return SM4.encrypt(JSON.stringify(val), key, {
      inputEncoding: 'utf-8',
      outputEncoding: 'hex'
    })
  }
  /**
   * SM4 解密
   */
  sm4Decrypt(token: string, key: string) {
    if (!token) {
      return token
    }
    return SM4.decrypt(token, key, {
      inputEncoding: 'hex',
      outputEncoding: 'utf-8'
    })
  }

  async getOption(key: string) {
    if (this.option.keys) {
      return [this.option.keys[key]?.[0], this.option.expiredIn]
    }
    if (this.option.keysFn) {
      const data = await this.option.keysFn()
      return [data[key]?.[0], this.option.expiredIn]
    }
    return []
  }

  async verify(body: { token: string; sercet: string }) {
    let msg = '解析成功'
    let success = false
    const { token, sercet } = body
    try {
      if (!token?.trim()) {
        throw new HttpException('请提供有效的token', HttpStatus.INTERNAL_SERVER_ERROR)
      }

      if (!sercet || sercet?.length !== 32) {
        throw new HttpException('请提供有效的sercet', HttpStatus.INTERNAL_SERVER_ERROR)
      }

      const { expiresIn, data } = JSON.parse(this.sm4Decrypt(token, sercet)) || {}

      if (expiresIn < new Date().getTime()) {
        throw new HttpException('当前token已经过期,请重新生成', HttpStatus.INTERNAL_SERVER_ERROR)
      }
      const oa = (await this.oa.findOneBy({ token }).catch()) || ({} as Oa)

      success = true

      if (oa?.token && oa.use) {
        throw new HttpException(
          '当前token 已经被使用过,请重新生成',
          HttpStatus.INTERNAL_SERVER_ERROR
        )
      }

      return this.option.format ? this.option.format(data) : data
    } catch (e) {
      msg = e?.message || '未知异常，请联系管理员'
      throw new HttpException(msg, HttpStatus.INTERNAL_SERVER_ERROR)
    } finally {
      await this.oa
        .update(
          {
            token
          },
          {
            result: success ? 1 : 2,
            use: success ? true : false,
            msg
          }
        )
        .catch()
    }
  }

  async storeOa(data: Oa) {
    return this.oa.save(data)
  }
}
