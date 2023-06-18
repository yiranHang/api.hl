import { BindRepository } from '@admin-hl/database'
import { Repository } from 'typeorm'
import { Permission } from './permission.entity'

@BindRepository(Permission)
export class PermissionRepository extends Repository<Permission> {}
