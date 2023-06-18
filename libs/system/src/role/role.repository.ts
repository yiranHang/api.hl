import { BindRepository } from '@admin-hl/database'
import { TreeRepository } from 'typeorm'
import { Role } from './role.entity'

@BindRepository(Role)
export class RoleRepository extends TreeRepository<Role> {}
