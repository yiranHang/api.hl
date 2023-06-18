import { BindRepository } from '@admin-hl/database'
import { Repository } from 'typeorm'
import { Documents } from './documents.entity'
@BindRepository(Documents)
export class DocumentsRepository extends Repository<Documents> {}
