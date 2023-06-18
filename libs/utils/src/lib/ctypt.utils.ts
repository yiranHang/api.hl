import { SM3, SM4 } from 'gm-crypto'
/**
 * 密码加密
 * 采用SM3
 */
export function sm3Encrypt(password: string) {
  return SM3.digest(password, 'utf-8', 'hex')
}

/**
 * SM4 加密
 */
export function Sm4Encrypt(val: string, key = 'F5EF9D92F8E8405BAD8CD90FCEA254C5') {
  if (!val) {
    return val
  }
  return SM4.encrypt(val, key, {
    inputEncoding: 'utf-8',
    outputEncoding: 'hex'
  })
}

/**
 * SM4 解密
 */
export function Sm4Decrypt(val: string, key = 'F5EF9D92F8E8405BAD8CD90FCEA254C5') {
  if (!val) {
    return val
  }
  return SM4.decrypt(val, key, {
    inputEncoding: 'hex',
    outputEncoding: 'utf-8'
  })
}
