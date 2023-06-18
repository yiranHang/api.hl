export const AUTH_LOGIN_PROVIDE_OPTION = Symbol('AUTH_LOGIN_PROVIDE')
export const JWT_SIGN = Symbol('JWT_SIGN')
export const USER = Symbol('USER')
export const isNotEmptyObject = <K = unknown>(val: K) => {
  return (
    Object.prototype.toString.call(val).toLowerCase() === '[object object]' &&
    Object.keys(val).length > 0
  )
}
