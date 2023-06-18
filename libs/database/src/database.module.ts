import { DynamicModule, Module } from '@nestjs/common'
import {
  DatabaseModuleAsyncOptions,
  ITypeOrmModuleOptions,
  MOption,
  NoSafe
} from './database.interface'
import { factoryToOptions, getProviders, mapTypeOrmOption } from './database.util'
import { TypeOrmModule } from '@nestjs/typeorm'
@Module({})
export class DataBaseModule {
  /**
   * 通过factory 配置数据库参数
   *
   * @param option
   * @returns
   */
  static forRootAsync(option: DatabaseModuleAsyncOptions): DynamicModule {
    const { imports = [], ...arg } = option
    const settings = factoryToOptions(arg)
    return DataBaseModule.forRoot(settings, imports)
  }

  /**
   * 直接配置数据库参数
   *
   * @param option
   * @returns
   */
  static forRoot(option: ITypeOrmModuleOptions | ITypeOrmModuleOptions[], imports = []) {
    return {
      module: DataBaseModule,
      imports: [...mapTypeOrmOption(option), ...imports]
    }
  }

  static forFeature(repositories: NoSafe[], option?: MOption) {
    const { name = 'default', isTree = false, global = false, educe = true } = option || {}
    const [providers, entities] = getProviders(repositories, isTree, name)
    const module = TypeOrmModule.forFeature([...entities], name)
    return {
      module: DataBaseModule,
      global,
      imports: [module],
      providers,
      exports: educe ? providers : []
    }
  }
}
