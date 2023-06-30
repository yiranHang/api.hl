import { HttpException, Injectable } from '@nestjs/common'
import { Equal, FindManyOptions, FindOptionsWhere, Like } from 'typeorm'
import { Pages, QueryEntity } from '../system.type'
import { DictDetailRepository, DictRepository } from './dict.repository'
import { Dict } from './dict.entity'
import { DictDetail } from './dict-detail.entity'

@Injectable()
export class DictService {
  constructor(readonly repo: DictRepository, private detail: DictDetailRepository) {}

  async getMany(query: QueryEntity<Dict>): Promise<Pages<Dict>> {
    const { pi, ps, key, name } = query || {}
    const findCondition: FindManyOptions<Dict> = {}
    const where: FindOptionsWhere<Dict> = {}
    const page = isNaN(Number(pi)) ? 1 : Number(pi)
    const limit = isNaN(Number(ps)) ? 0 : Number(ps)
    if (limit > 0) {
      findCondition.skip = Math.abs(page - 1) * limit
      findCondition.take = limit
    }
    if (key && key.trim()) {
      where.key = Like(`%${key.trim()}%`)
    }
    if (name && name.trim()) {
      where.name = Like(`%${name.trim()}%`)
    }
    if (Object.keys(where).length) {
      findCondition.where = where
    }
    const [data, count] = await this.repo.findAndCount(findCondition)
    return {
      data,
      count,
      page,
      limit
    }
  }

  async validCreateDict(body: Dict) {
    if (!body?.name) {
      throw new HttpException('字典名称不能为空', 500)
    }

    if (!body?.key) {
      throw new HttpException('字典类型不能为空', 500)
    }
    const users = await this.repo.createQueryBuilder('dict').select('key').withDeleted().getMany()
    const findKey = users.find(({ key }) => key === body.key)
    if (findKey) {
      throw new HttpException('字典类型已存在', 500)
    }
  }

  async createOne(data: Dict) {
    await this.validCreateDict(data)
    const dict = new Dict()
    Object.assign(dict, data)
    return await this.repo.save(data)
  }

  async updateOne(id: string, body: Dict) {
    return await this.repo.update(id, body)
  }

  async deleteData(id: string | string[]) {
    return await this.repo.delete(id)
  }

  async getOne(id: string) {
    return await this.repo.findOneBy({ id })
  }

  async checkKeyExists(key: string, id: string) {
    if (!key) {
      return null
    }
    if (id) {
      const user = await this.repo.findOneBy({ id })
      if (user?.key === key) {
        return null
      }
    }
    return this.repo.findOneBy({ key })
  }

  async createDetailOne(body: DictDetail) {
    return await this.detail.save(body)
  }

  async getDetailMany(query: QueryEntity<DictDetail>): Promise<Pages<DictDetail>> {
    const { pi, ps, label, disabled, dict } = query || {}
    const findCondition: FindManyOptions<DictDetail> = {}
    const where: FindOptionsWhere<DictDetail> = {}
    const page = isNaN(Number(pi)) ? 1 : Number(pi)
    const limit = isNaN(Number(ps)) ? 0 : Number(ps)
    if (limit > 0) {
      findCondition.skip = Math.abs(page - 1) * limit
      findCondition.take = limit
    }
    if (label && label.trim()) {
      where.label = Like(`%${label.trim()}%`)
    }
    if (dict) {
      where.dict = { id: dict } as Dict
    }
    if (typeof disabled !== 'undefined') {
      where.disabled = disabled
    }
    if (Object.keys(where).length) {
      findCondition.where = where
    }
    const [data, count] = await this.detail.findAndCount(findCondition)
    return {
      data,
      count,
      page,
      limit
    }
  }

  async getDetailOne(id: string) {
    return await this.detail.findOneBy({ id })
  }

  async deleteDetailData(id: string | string[]) {
    return await this.detail.delete(id)
  }

  async updateDetailOne(id: string, body: DictDetail) {
    return await this.detail.update(id, body)
  }

  async getEnumByKey(key: string) {
    const data = await this.repo.findOne({
      where: {
        key
      },
      relations: ['detail']
    })
    return data?.detail || []
  }
}
