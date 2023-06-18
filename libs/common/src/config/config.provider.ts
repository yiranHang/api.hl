import { Injectable, Logger } from '@nestjs/common'
import * as yaml from 'js-yaml'
import { existsSync, readFileSync } from 'fs'
import { basename, join } from 'path'
import { ConfigOption, IApplication } from './config.interface'

@Injectable()
export class ConfigProvider {
  private option!: ConfigOption

  constructor() {
    this.load()
  }

  /**
   * 配置信息
   *
   */
  public config!: unknown
  private get path() {
    return this.option?.file || 'env'
  }

  private get async() {
    return !this.option?.async
  }

  private get NODE_ENV() {
    const env = process.env?.['NODE_ENV']
    return env || 'development'
  }

  private get yamlPath() {
    const hasYaml = this.path.includes('.yaml')
    return hasYaml ? this.path : join(process.cwd(), this.path, `${this.NODE_ENV}.yaml`)
  }

  private load() {
    let message = `配置文件加载成功 ${basename(this.yamlPath)} `
    if (!existsSync(this.yamlPath)) {
      message = `配置文件 ${this.yamlPath} 不存在`
    } else {
      try {
        this.config = yaml.load(readFileSync(this.yamlPath, 'utf8'))
      } catch (error) {
        message = `配置文件 ${this.yamlPath} 加载失败`
      }
    }
    Logger.verbose(message, JSON.stringify(this.config), 'ConfigProvider')
    //**写入port 到环境变量 */
    process.env = {
      N_PORT: this.get<IApplication>('application')?.port || 3333
    } as unknown as NodeJS.ProcessEnv
  }

  /**
   * Yaml配置文件信息
   *
   * @readonly
   * @private
   * @memberof KalendConfigService
   */
  private get yaml() {
    if (!this.config) {
      this.load()
    }
    return this.config
  }

  /**是开发环境 */
  get isDevelopment() {
    return Object.is(this.NODE_ENV, 'development')
  }

  /**是生产环境 */
  get isProduction() {
    return Object.is(this.NODE_ENV, 'production')
  }

  /**是测试环境 */
  get isTest() {
    return Object.is(this.NODE_ENV, 'test')
  }

  /**所有指定信息（支持一层） */
  get<T = unknown>(key: string): T | null {
    return this.yaml?.[key]
  }

  /**读取所有信息 */
  getYaml<T = unknown>() {
    return (this.yaml || {}) as unknown as T
  }
}
