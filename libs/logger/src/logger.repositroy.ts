import { BindRepository } from '@admin-hl/database'
import { Repository } from 'typeorm'
import { Logger } from './logger.entity'

@BindRepository(Logger)
export class LoggerRepository extends Repository<Logger> {}
