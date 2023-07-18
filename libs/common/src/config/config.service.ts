import { Injectable, Logger } from '@nestjs/common'
import { ConfigOption, Config } from './config.interface'
import * as yaml from 'js-yaml'
import { existsSync, readFileSync } from 'fs'
import { basename, join } from 'path'

@Injectable()
export class ConfigService {
  private option!: ConfigOption

  /**
   * 配置信息
   *
   * @type {(Config)}
   * @memberof ConfigService
   */
  public config!: Config

  constructor() {
    this.init()
  }

  private init() {
    if (this.async || !this.config) {
      this.load()
    }
  }

  private get path() {
    return this.option?.file || 'env'
  }

  private get async() {
    return !!this.option?.async
  }

  private get NODE_ENV() {
    const env = process.env?.['NODE_ENV']
    return env || 'development'
  }

  private get yamlPath() {
    const hasYaml = this.path.includes('.yaml')
    return hasYaml ? this.path : join(process.cwd(), this.path, `${this.NODE_ENV}.yaml`)
  }

  /**将yaml 配置信息写入环境变量 */
  private writeEnv() {
    process.env = {
      N_PORT: this.config?.application?.port || 3333,
      ...process.env,
      ...(this.config || {})
    } as unknown as NodeJS.ProcessEnv
  }

  private load() {
    let message = `配置文件加载成功 ${basename(this.yamlPath)} `
    if (!existsSync(this.yamlPath)) {
      message = `配置文件 ${this.yamlPath} 不存在`
    } else {
      try {
        this.config = yaml.load(readFileSync(this.yamlPath, 'utf8')) as Config
      } catch (error) {
        message = `配置文件 ${this.yamlPath} 加载失败`
      }
    }
    Logger.verbose(message, JSON.stringify(this.config), 'ConfigProvider')
    //**写入port 到环境变量 */
    this.writeEnv()
  }

  /**
   * Yaml配置文件信息
   *
   * @readonly
   * @private
   * @memberof ConfigService
   */
  private get yaml() {
    if (this.async || !this.config) {
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

  /**所有信息 */
  get(key?: 'application' | 'logger' | 'database' | 'redis') {
    return key ? this.yaml[key] || null : this.yaml
  }
}
