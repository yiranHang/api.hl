import { HttpException, Injectable } from '@nestjs/common'
import { FindManyOptions, Like } from 'typeorm'
import { ConfigService } from '../core/service/config.service'
import { Pages, QueryEntity } from '../system.type'
import { RoleRepository } from './role.repository'
import { Role } from './role.entity'
import { DataBaseSource } from '@admin-hl/database'

@Injectable()
export class RoleService {
  constructor(
    private repo: RoleRepository,
    private config: ConfigService,
    private dataSource: DataBaseSource
  ) {}

  async getMany(query: QueryEntity<Role>): Promise<Pages<Role>> {
    const { pi, ps, name } = query || {}
    const findCondition: FindManyOptions<Role> = {
      relations: ['permissions']
    }
    const page = isNaN(Number(pi)) ? 1 : Number(pi)
    const limit = isNaN(Number(ps)) ? 0 : Number(ps)
    if (limit > 0) {
      findCondition.skip = Math.abs(page - 1) * limit
      findCondition.take = limit
    }
    if (name && name.trim()) {
      findCondition.where = {
        name: Like(`%${name.trim()}%`)
      }
    }
    const [data, count] = await this.repo.findAndCount(findCondition)
    return {
      data,
      count,
      page,
      limit
    }
  }

  async getOne(id: string) {
    return this.repo.findOneBy({ id })
  }

  validCreateRole(body: Role) {
    if (!body?.name) {
      throw new HttpException('角色名称不能为空', 500)
    }

    if (!body?.code) {
      throw new HttpException('角色代码不能为空', 500)
    }
  }

  async createOne(body: Role) {
    this.validCreateRole(body)
    const role = new Role()
    role.code = body.code
    role.forbidden = body.forbidden
    role.name = body.name
    role.remark = body.remark ?? null
    return this.repo.save(role)
  }

  async updateOne(id: string, body: Role) {
    const { permissions, ...arg } = body || {}
    if (Object.keys(arg).length) {
      return await this.repo.update(id, {
        ...arg,
        updateTime: new Date()
      })
    }
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()
    try {
      if (Array.isArray(permissions)) {
        const result = await this.repo.findOne({
          where: { id },
          relations: ['permissions']
        })
        if (result.permissions.length) {
          await queryRunner.manager
            .createQueryBuilder(Role, 'r')
            .relation('permissions')
            .of(id)
            .remove(result.permissions)
        }
        if (permissions.length) {
          await queryRunner.manager
            .createQueryBuilder(Role, 'r')
            .relation('permissions')
            .of(id)
            .add(permissions)
        }
      }
      return await queryRunner.commitTransaction()
    } catch (err: unknown) {
      await queryRunner.rollbackTransaction()
    } finally {
      await queryRunner.release()
    }
    throw new HttpException('更新ROLE失败，请检查参数或联系管理员', 500)
  }

  async deleteData(id: string | string[]) {
    const softDelete = this.config.getSoftDelete('role')
    return softDelete ? this.repo.softDelete(id) : this.repo.delete(id)
  }
  async getList() {
    return this.repo
      .createQueryBuilder('r')
      .select('r.name', 'label')
      .addSelect('r.id', 'value')
      .where('r.forbidden=false')
      .orderBy('r.create_time', 'DESC')
      .getRawMany()
  }

  async checkRoleExists(code: string, id: string) {
    if (!code) {
      return null
    }
    if (id) {
      const role = await this.repo.findOneBy({ id })
      if (role?.code === code) {
        return null
      }
    }
    return this.repo.findOneBy({ code })
  }
  // 返回树
  async getTree() {
    return this.repo.findTrees()
  }
}
