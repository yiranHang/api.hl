import { EntityTarget, ObjectLiteral } from 'typeorm'
import { BIND_REPOSITORY } from '../database.constant'
export function BindRepository<Entity extends ObjectLiteral>(entity: EntityTarget<Entity>) {
  return (target: object) => {
    Reflect.defineMetadata(BIND_REPOSITORY, entity, target)
  }
}
