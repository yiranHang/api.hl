import { Injectable } from '@nestjs/common'
import { FindManyOptions, Like } from 'typeorm'
import { Pages, QueryEntity } from '../system.type'
import { DictDetailRepository, DictRepository } from './dict.repository'
import { Dict } from './dict.entity'
import { DictDetail } from './dict-detail.entity'

@Injectable()
export class DictService {
  constructor(readonly repo: DictRepository, private detail: DictDetailRepository) {}

  async getMany(query: QueryEntity<Dict>): Promise<Pages<Dict>> {
    const { pi, ps, key, name } = query || {}
    const findCondition: FindManyOptions<Dict> = {
      where: {}
    }
    const page = isNaN(Number(pi)) ? 1 : Number(pi)
    const limit = isNaN(Number(ps)) ? 0 : Number(ps)
    if (limit > 0) {
      findCondition.skip = Math.abs(page - 1) * limit
      findCondition.take = limit
    }
    if (key && key.trim()) {
      findCondition.where['key'] = Like(`%${key.trim()}%`)
    }
    if (name && name.trim()) {
      findCondition.where['name'] = Like(`%${name.trim()}%`)
    }
    const [data, count] = await this.repo.findAndCount(findCondition)
    return {
      data,
      count,
      page,
      limit
    }
  }

  async createOne(data: Dict) {
    return this.repo.save(data)
  }

  async updateOne(id: string, body: Dict) {
    return this.repo.update(id, body)
  }

  async deleteData(id: string | string[]) {
    return this.repo.delete(id)
  }

  async getOne(id: string) {
    return this.repo.findOneBy({ id })
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

  createDetailOne(body: DictDetail) {
    return this.detail.save(body)
  }

  async getDetailMany(query: QueryEntity<DictDetail>): Promise<Pages<DictDetail>> {
    const { pi, ps, label, disabled, dict } = query || {}
    const findCondition: FindManyOptions<DictDetail> = {
      where: {}
    }
    const page = isNaN(Number(pi)) ? 1 : Number(pi)
    const limit = isNaN(Number(ps)) ? 0 : Number(ps)
    if (limit > 0) {
      findCondition.skip = Math.abs(page - 1) * limit
      findCondition.take = limit
    }
    if (label && label.trim()) {
      findCondition.where['label'] = Like(`%${label.trim()}%`)
    }
    if (dict) {
      findCondition.where['dict'] = { id: dict }
    }
    if (typeof disabled !== 'undefined') {
      findCondition.where['disabled'] = disabled
    }
    const [data, count] = await this.detail.findAndCount(findCondition)
    return {
      data,
      count,
      page,
      limit
    }
  }

  getDetailOne(id: string) {
    return this.detail.findOneBy({ id })
  }

  deleteDetailData(id: string | string[]) {
    return this.detail.delete(id)
  }

  updateDetailOne(id: string, body: DictDetail) {
    return this.detail.update(id, body)
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
