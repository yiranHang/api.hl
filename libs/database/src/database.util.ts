import { BIND_REPOSITORY } from './database.constant'
import { DatabaseModuleAsyncOptions, ITypeOrmModuleOptions, NoSafe } from './database.interface'
import { EntityTarget, DataSource } from 'typeorm'
import { getDataSourceToken, TypeOrmModule } from '@nestjs/typeorm'
import { DataBaseSource } from './database.source'
/**
 * 将factory注入方式的转为时间value
 * 不支持嵌套注入
 *
 * @param factory
 * @returns
 */
export const factoryToOptions = (factory: DatabaseModuleAsyncOptions) => {
  const inject = (factory.inject || []).map(r => (typeof r === 'function' ? new r() : r))
  const options = factory.useFactory && factory.useFactory(...inject)
  return options
}

/**
 * 遍历传递的数据库参数
 * 返回orm 的DynamicModule
 *
 * @param options
 * @returns
 */
export const mapTypeOrmOption = (options: ITypeOrmModuleOptions | ITypeOrmModuleOptions[]) => {
  const ormModule = (option: ITypeOrmModuleOptions) => {
    delete option?.disabled
    return TypeOrmModule.forRootAsync({
      name: option.name || 'default',
      useFactory: () => option
    })
  }
  const settings = Array.isArray(options) ? options : options ? [options] : []

  return settings.filter(s => !s.disabled).map(r => ormModule(r))
}

/**
 * 合并Repository
 */
const megreRepository = <S, T>(source: { new (...arg: NoSafe[]): S }, target: T) => {
  const method: NoSafe = source.prototype
  const propertyNames = Object.getOwnPropertyNames(method)
  propertyNames.map(name => {
    if ('constructor' !== name) {
      Object.assign(target, { [name]: method[name] })
    }
  })
  return target
}

export const getProviders = (
  repositories: EntityTarget<unknown>[],
  isTree: boolean,
  name: string
) => {
  const entities: NoSafe[] = []
  const provides = repositories.map(repository => {
    const entity = Reflect.getMetadata(BIND_REPOSITORY, repository)
    entities.push(entity)
    return {
      provide: repository,
      useFactory: (data: DataSource) => {
        const repo = isTree ? data.getTreeRepository(entity) : data.getRepository(entity)
        return megreRepository(repository as NoSafe, repo)
      },
      inject: [getDataSourceToken(name)]
    }
  })
  return [
    [
      ...provides,
      {
        provide: DataBaseSource,
        useFactory: (data: DataSource) => {
          return data
        },
        inject: [getDataSourceToken(name)]
      }
    ],
    entities
  ]
}
