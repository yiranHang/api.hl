import { Inject, Injectable } from '@nestjs/common'
import { DBOption, KalendRbacOptions } from '../../system.type'
import { RBAC_OPTION, TYPEORM_NAME } from '../../system.constant'

@Injectable()
export class ConfigService {
  constructor(
    @Inject(RBAC_OPTION) readonly option: KalendRbacOptions,
    @Inject(TYPEORM_NAME) readonly name: DBOption
  ) {}

  get initialize() {
    const dt = {
      administrator: {
        account: 'admin',
        role: 'admin'
      },
      rootName: 'system'
    }
    return this.option?.initialize || dt
  }

  get crudAuthority() {
    return [
      {
        method: 'post',
        code: 'post',
        name: '新增'
      },
      {
        method: 'delete',
        code: 'delete',
        name: '删除'
      },
      {
        method: 'get',
        code: 'get',
        name: '获取'
      },
      {
        method: 'patch',
        code: 'patch',
        name: '更新'
      }
    ]
  }

  get paging() {
    const dt = {
      page: 'pi',
      limit: 'ps',
      total: 'count',
      result: 'data'
    }
    return this.option?.paging || dt
  }

  get defaultRole() {
    return this.option?.initialize?.administrator?.role || 'admin'
  }

  get defaultAccount() {
    return this.option?.initialize?.administrator?.account || 'admin'
  }

  get typeOrmName() {
    return this.name[0] || 'default'
  }

  get acl() {
    return !!this.option.acl
  }

  /**
   * 获取软删标识
   *
   * @param name
   * @returns
   */
  getSoftDelete(name: 'department' | 'user' | 'role' | 'menu') {
    const { softDelete } = this.option || {}
    if (typeof softDelete === 'object') {
      return !!softDelete[name]
    }
    return !!softDelete
  }

  getExcludeController() {
    const { acl } = this.option || {}
    if (typeof acl === 'boolean') {
      return { sign: acl, fun: [], ob: [] }
    }
    if (Array.isArray(acl)) {
      const fun = acl.filter(a => typeof a === 'function')
      const ob = acl.filter(a => typeof a === 'object')
      return { sign: true, fun, ob }
    }
    return { sign: false, fun: [], ob: [] }
  }
}
