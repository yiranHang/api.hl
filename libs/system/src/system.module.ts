import {
  DynamicModule,
  MiddlewareConsumer,
  Module,
  NestModule,
  OnModuleInit,
  Provider
} from '@nestjs/common'
import { MenuModule } from './menu/menu.module'
import { UserModule } from './user/user.module'
import { RoleModule } from './role/role.module'

import { DBOption, KalendRbacAsyncOptions, KalendRbacOptions } from './system.type'
import { RBAC_OPTION, TYPEORM_NAME } from './system.constant'
import { getArray } from './system.util'
import { AclService } from './core/service/acl.service'
import { DiscoveryService } from '@nestjs/core'
import { SystemService } from './system.service'
import { ConfigService } from './core/service/config.service'
import { PermissionModule } from './permission/permission.module'
import { DictModule } from './dict/dict.module'

@Module({
  providers: [ConfigService, SystemService],
  imports: [PermissionModule]
})
export class SystemModule implements OnModuleInit, NestModule {
  constructor(private service: SystemService, private acl: AclService) {}

  configure(consumer: MiddlewareConsumer) {
    this.acl.setAclMiddleware(consumer)
  }

  onModuleInit() {
    this.service.initializeDb()
  }

  static getModule(arg: DBOption, provider: Provider[], imports = []) {
    const providers = [
      AclService,
      DiscoveryService,
      {
        provide: TYPEORM_NAME,
        useValue: arg
      },
      ...provider
    ]
    return {
      module: SystemModule,
      global: true,
      imports: [
        ...imports,
        MenuModule.forRoot(arg),
        PermissionModule.forRoot(arg),
        UserModule.forRoot(arg),
        RoleModule.forRoot(arg),
        DictModule.forRoot(arg)
      ],
      providers,
      exports: providers
    }
  }

  static forRoot = (arg?: DBOption, option?: KalendRbacOptions): DynamicModule => {
    return SystemModule.getModule(getArray(arg), [
      {
        provide: RBAC_OPTION,
        useValue: option || {}
      }
    ])
  }

  static forRootAsync = (arg?: DBOption, option?: KalendRbacAsyncOptions) => {
    const { imports = [], inject = [], useFactory = () => ({}) } = option || {}

    return SystemModule.getModule(
      getArray(arg),
      [
        {
          provide: RBAC_OPTION,
          useFactory
        },
        ...inject
      ],
      imports
    )
  }
}
