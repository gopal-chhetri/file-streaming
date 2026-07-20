import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly em: EntityManager) {}

  async create(createUserDto: CreateUserDto, roleName = 'user'): Promise<User> {
    const existingEmail = await this.em.findOne(User, { email: createUserDto.email });
    if (existingEmail) {
      throw new ConflictException('Email already in use');
    }

    const existingUsername = await this.em.findOne(User, { username: createUserDto.username });
    if (existingUsername) {
      throw new ConflictException('Username already in use');
    }

    let role = await this.em.findOne(Role, { name: roleName });
    if (!role) {
      // Auto-create role if it does not exist yet (helpful for tests / initial run before seed)
      role = this.em.create(Role, {
        name: roleName,
        description: `${roleName} role`,
      });
      await this.em.flush();
    }

    const user = this.em.create(User, {
      email: createUserDto.email,
      username: createUserDto.username,
      passwordHash: createUserDto.password, // hashed in Phase 2
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      role,
    });

    await this.em.flush();
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.em.findOne(User, { email }, { populate: ['role'] });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.em.findOne(User, { username }, { populate: ['role'] });
  }

  async findById(id: string): Promise<User | null> {
    return this.em.findOne(User, { id }, { populate: ['role'] });
  }

  async findAll(): Promise<User[]> {
    return this.em.find(
      User,
      {},
      {
        fields: ['id', 'email', 'username', 'firstName', 'lastName', 'role', 'isActive', 'createdAt'] as any,
        orderBy: { createdAt: 'DESC' },
        populate: ['role'],
      },
    );
  }
}
