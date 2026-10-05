import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

const SALT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(private readonly em: EntityManager) {}

  async create(createUserDto: CreateUserDto, roleName = 'user'): Promise<User> {
    const existingEmail = await this.em.findOne(User, {
      email: createUserDto.email,
    });
    if (existingEmail) {
      throw new ConflictException('Email already in use');
    }

    const existingUsername = await this.em.findOne(User, {
      username: createUserDto.username,
    });
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
      passwordHash: await bcrypt.hash(createUserDto.password, SALT_ROUNDS),
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

  /** The API representation of a user: never includes the password hash. */
  static toResponse(u: User): UserResponseDto {
    return {
      id: u.id,
      email: u.email,
      username: u.username,
      firstName: u.firstName,
      lastName: u.lastName,
      role: { id: u.role.id, name: u.role.name },
      isActive: u.isActive,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    };
  }

  async getProfile(id: string): Promise<UserResponseDto> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return UsersService.toResponse(user);
  }

  async findAll() {
    const users = await this.em.find(
      User,
      {},
      {
        orderBy: { createdAt: 'DESC' },
        populate: ['role'],
      },
    );
    return users.map((u) => UsersService.toResponse(u));
  }

  async updateRole(userId: string, roleName: string, currentUserRole: string) {
    if (currentUserRole !== 'admin') {
      throw new ForbiddenException('Only admins can change roles');
    }

    const user = await this.em.findOne(User, userId, { populate: ['role'] });
    if (!user) throw new NotFoundException('User not found');

    const role = await this.em.findOne(Role, { name: roleName });
    if (!role) throw new NotFoundException(`Role '${roleName}' not found`);

    user.role = role;
    await this.em.flush();
    return { id: user.id, role: { id: role.id, name: role.name } };
  }

  async toggleActive(userId: string, currentUserRole: string) {
    if (currentUserRole !== 'admin') {
      throw new ForbiddenException('Only admins can toggle user status');
    }

    const user = await this.em.findOne(User, userId);
    if (!user) throw new NotFoundException('User not found');

    user.isActive = !user.isActive;
    await this.em.flush();
    return { id: user.id, isActive: user.isActive };
  }

  async deleteUser(userId: string, currentUserRole: string) {
    if (currentUserRole !== 'admin') {
      throw new ForbiddenException('Only admins can delete users');
    }

    const user = await this.em.findOne(User, userId);
    if (!user) throw new NotFoundException('User not found');

    await this.em.remove(user).flush();
    return { id: userId, deleted: true };
  }
}
