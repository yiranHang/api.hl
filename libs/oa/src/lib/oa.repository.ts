import { Repository } from 'typeorm'
import { Oa } from './oa.entity'
import { BindRepository } from '@admin-api/database'

@BindRepository(Oa)
export class OaRepository extends Repository<Oa> {}
