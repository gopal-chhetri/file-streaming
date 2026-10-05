/**
 * MikroORM 7 and uuid 14 are ESM-only, which Jest's CommonJS runtime can't
 * load. Unit specs never touch a database: stand in for the runtime values
 * services and entities import. Decorators become no-ops and EntityManager
 * is only a DI token / type here.
 */
import { randomUUID } from 'node:crypto';

const noopDecorator = () => () => undefined;

jest.mock('@mikro-orm/decorators/legacy', () =>
  new Proxy({}, { get: () => noopDecorator }),
);
jest.mock('@mikro-orm/core', () => ({
  EntityManager: class {},
  OptionalProps: Symbol('OptionalProps'),
  Collection: class {},
}));
jest.mock('uuid', () => ({ v4: () => randomUUID() }));
