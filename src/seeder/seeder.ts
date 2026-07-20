import { config as dotenvConfig } from 'dotenv';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { MikroORM } from '@mikro-orm/core';
import { Migrator } from '@mikro-orm/migrations';
import * as bcrypt from 'bcrypt';
import { Role } from '../users/entities/role.entity';
import { User } from '../users/entities/user.entity';

dotenvConfig({ path: 'deployments/local/.env' });

const SALT_ROUNDS = 12;

const seedRoles = [
  { name: 'admin', description: 'Administrator with full access' },
  { name: 'staff', description: 'Staff member with limited access' },
  { name: 'user', description: 'Regular user with limited access' },
];

const seedUsers = [
  { email: 'admin@gmail.com', username: 'admin', password: 'password123', firstName: 'Admin', lastName: 'User', role: 'admin' },
  { email: 'staff@gmail.com', username: 'staff', password: 'password123', firstName: 'Staff', lastName: 'User', role: 'staff' },
  { email: 'user@gmail.com', username: 'user', password: 'password123', firstName: 'Regular', lastName: 'User', role: 'user' },
];

async function seed() {
  const orm = await MikroORM.init({
    driver: PostgreSqlDriver,
    extensions: [Migrator],
    dbName: process.env.DB_NAME || 'streaming',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'streaming',
    password: process.env.DB_PASS || 'streaming',
    entities: [Role, User],
  } as any);

  const em = orm.em.fork();

  // Seed roles
  const createdRoles: string[] = [];
  for (const roleData of seedRoles) {
    const existing = await em.findOne(Role, { name: roleData.name });
    if (!existing) {
      em.create(Role, roleData);
      createdRoles.push(roleData.name);
    }
  }
  await em.flush();
  console.log(`Roles: ${createdRoles.length ? `Created ${createdRoles.join(', ')}` : 'Already exist'}`);

  // Seed users
  const createdUsers: string[] = [];
  for (const userData of seedUsers) {
    const existing = await em.findOne(User, { email: userData.email });
    if (existing) {
      continue;
    }

    const role = await em.findOne(Role, { name: userData.role });
    if (!role) {
      console.error(`Role '${userData.role}' not found — skipping user ${userData.email}`);
      continue;
    }

    const passwordHash = await bcrypt.hash(userData.password, SALT_ROUNDS);
    em.create(User, {
      email: userData.email,
      username: userData.username,
      passwordHash,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role,
    });
    createdUsers.push(userData.email);
  }
  await em.flush();
  console.log(`Users: ${createdUsers.length ? `Created ${createdUsers.join(', ')}` : 'Already exist'}`);

  await orm.close();
  console.log('Seed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
