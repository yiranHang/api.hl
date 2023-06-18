import { Repository } from 'typeorm'
import { Dict } from './dict.entity'
import { BindRepository } from '@admin-hl/database'
import { DictDetail } from './dict-detail.entity'

@BindRepository(Dict)
export class DictRepository extends Repository<Dict> {}

@BindRepository(DictDetail)
export class DictDetailRepository extends Repository<DictDetail> {}
