/**
 * 配置信息选项
 *
 * @export
 * @type KalendConfigOption
 */
export type ConfigOption = {
  /**
   * 读取配置文件的名称
   *
   * @type {string}
   */
  file?: string
  /**
   * 每次注入config是否都读取配置文件内容（默认:false）
   *
   * @type {boolean}
   */
  async?: boolean
}

/**
 * 应用配置信息
 *
 * @export
 * @interface IApplication
 */
export interface IApplication {
  port: number
}
