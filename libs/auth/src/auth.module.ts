import { DynamicModule, FactoryProvider, Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { AuthService } from './service/auth.service'
import { AuthAsyncOption, AuthOption } from './auth.interface'
import { ConfigService } from './service/config.service'
import { AUTH_LOGIN_PROVIDE_OPTION } from './auth.constant'
import { JwtStrategy } from './strategy/jwt.strategy'

@Module({})
export class AuthModule {
  constructor(private auth: AuthService) {
    this.auth.initializeGuard()
  }

  static forRoot(options?: AuthOption): DynamicModule {
    const authProvider = [
      {
        provide: AUTH_LOGIN_PROVIDE_OPTION,
        useValue: options || {}
      },
      ConfigService
    ]
    return {
      module: AuthModule,
      imports: [JwtModule.register(options?.jwtOption || {})],
      global: true,
      providers: [AuthService, JwtStrategy, ...authProvider],
      exports: [...authProvider]
    }
  }

  static forRootAsync(options?: AuthAsyncOption): DynamicModule {
    const authProvider = [
      {
        provide: AUTH_LOGIN_PROVIDE_OPTION,
        ...(options || {})
      } as FactoryProvider,
      ConfigService
    ]

    const JWT = JwtModule.registerAsync({
      useFactory: (auth: AuthOption) => {
        return auth.jwtOption || {}
      },
      inject: [ConfigService]
    })
    return {
      module: AuthModule,
      imports: [JWT, ...(options.imports || [])],
      global: true,
      providers: [AuthService, JwtStrategy, ...authProvider],
      exports: [...authProvider, JWT, AuthService, JwtStrategy]
    }
  }
}
