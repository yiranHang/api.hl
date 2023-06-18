import { SM3, SM4 } from 'gm-crypto'
import { DBOption } from './system.type'

export const getArray = (val?: DBOption) => (val && Array.isArray(val) ? val : ([] as DBOption))

export const getControllerName = (name: string) =>
  name ? name.toUpperCase().replace('CONTROLLER', '') : '未知'

export class CryptoUtil {
  private static key = 'DF1F3A30A5D28D5641443050DE662D7F'
  /**
   *
   * @param v 需加密的登录密码
   * @returns
   */
  static encryptPassWord(v: string) {
    return !v ? v : SM3.digest(v, 'utf-8', 'hex')
  }

  /**
   * SM4 加密
   */
  static sm4Encrypt(val: string | number | object) {
    return SM4.encrypt(JSON.stringify(val), this.key, {
      inputEncoding: 'utf-8',
      outputEncoding: 'hex'
    })
  }

  /**
   * SM4 解密
   */
  static sm4Decrypt(val: string) {
    const data = SM4.decrypt(val, this.key, {
      inputEncoding: 'hex',
      outputEncoding: 'utf-8'
    })
    try {
      return JSON.parse(data)
    } catch (error) {
      //TODO
    }
    return data
  }
}
