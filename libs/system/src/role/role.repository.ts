import { BindRepository } from '@admin-api/database'
import { TreeRepository } from 'typeorm'
import { Role } from './role.entity'

@BindRepository(Role)
export class RoleRepository extends TreeRepository<Role> {}
