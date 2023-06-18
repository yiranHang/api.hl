import { BindRepository } from '@admin-api/database'
import { Repository } from 'typeorm'
import { Documents } from './documents.entity'
@BindRepository(Documents)
export class DocumentsRepository extends Repository<Documents> {}
