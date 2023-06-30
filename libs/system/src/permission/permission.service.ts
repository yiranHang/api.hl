import { HttpException, Injectable } from '@nestjs/common'
import { Equal, FindManyOptions } from 'typeorm'
import { ConfigService } from '../core/service/config.service'
import { QueryEntity } from '../system.type'
import { PermissionRepository } from './permission.repository'
import { Permission } from './permission.entity'
import { DataBaseSource, NoSafe } from '@admin-api/database'

@Injectable()
export class PermissionService {
  constructor(
    readonly permission: PermissionRepository,
    public config: ConfigService,
    private dataSource: DataBaseSource
  ) {}

  private getPage(pi: number, ps: number) {
    const page = isNaN(Number(pi)) ? 1 : Number(pi)
    const limit = isNaN(Number(ps)) ? 0 : Number(ps)
    if (limit > 0) {
      return {
        skip: Math.abs(page - 1) * limit,
        take: limit
      }
    }
    return {}
  }

  addPermission(permission: Permission) {
    return this.permission.save(permission)
  }

  async updateManyPermission(acl: Permission[], user: string, department: string) {
    if (user || department) {
      if ((acl || []).length) {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()
        await queryRunner.startTransaction()
        try {
          const condition = user ? { user: Equal(user) } : { department: Equal(department) }
          await queryRunner.manager.delete(Permission, condition)
          const result = await queryRunner.manager.save(Permission, acl)
          await queryRunner.commitTransaction()
          return result
        } catch (err: unknown) {
          await queryRunner.rollbackTransaction()
        } finally {
          await queryRunner.release()
        }
      } else {
        const condition = user ? { user: Equal(user) } : { department: Equal(department) }
        return this.permission.delete(condition as NoSafe)
      }
    }
    throw new HttpException('批量更新PERMISSION失败，请检查参数或联系管理员', 500)
  }

  deletePermission(ids: string | string[]) {
    return this.permission.delete(ids)
  }
  updatePermission(id: string, body: Permission) {
    if (body && Object.keys(body).length) {
      return this.permission.update(id, {
        ...body,
        updateTime: new Date()
      })
    }
    return false
  }

  getPermission(id: string) {
    return this.permission.findOne({
      where: { id },
      relations: ['menu']
    })
  }

  async getPermissionMany(query: QueryEntity<Permission>) {
    if (!query?.menu) {
      throw new HttpException('缺少相关参数menu请联系管理员', 500)
    }
    const { pi, ps, menu } = query || {}
    const findCondition: FindManyOptions<Permission> = {
      relations: ['menu'],
      where: {
        menu: Equal(menu)
      },
      ...this.getPage(pi, ps)
    }
    const [data, count] = await this.permission.findAndCount(findCondition)
    return {
      data,
      count,
      page: Number(pi),
      limit: Number(ps)
    }
  }

  async checkCodeExists(code: string, id: string, menu: string) {
    if (!code) {
      return null
    }
    if (id) {
      const permission = await this.permission.findOneBy({ id })
      if (permission?.code === code) {
        return null
      }
    }
    return this.permission.findOne({
      where: {
        menu: Equal(menu),
        code
      }
    })
  }
}
