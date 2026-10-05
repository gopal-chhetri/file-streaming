import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EntityManager } from '@mikro-orm/core';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';

/** How long a just-rotated refresh token is still accepted (concurrent tabs). */
const REFRESH_GRACE_MS = 10_000;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly em: EntityManager,
  ) {}

  async register(dto: RegisterDto) {
    const existingEmail = await this.usersService.findByEmail(dto.email);
    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    const existingUsername = await this.usersService.findByUsername(
      dto.username,
    );
    if (existingUsername) {
      throw new ConflictException('Username already registered');
    }

    // UsersService.create hashes the password.
    const user = await this.usersService.create(
      {
        email: dto.email,
        username: dto.username,
        password: dto.password,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
      'user',
    );

    return this.issueTokens(user, uuidv4());
  }

  async validateLocalUser(
    usernameOrEmail: string,
    pass: string,
  ): Promise<User> {
    let user = await this.usersService.findByEmail(usernameOrEmail);
    if (!user) {
      user = await this.usersService.findByUsername(usernameOrEmail);
    }

    if (!user || !user.passwordHash || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async login(user: User) {
    return this.issueTokens(user, uuidv4());
  }

  async refresh(rawRefreshToken: string) {
    const tokenHash = this.hashToken(rawRefreshToken);
    const storedToken = await this.em.findOne(
      RefreshToken,
      { tokenHash },
      { populate: ['user'] },
    );

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // A deactivated account must not keep minting access tokens.
    if (!storedToken.user.isActive) {
      await this.revokeFamily(storedToken.familyId);
      throw new UnauthorizedException('Account is deactivated');
    }

    if (storedToken.revokedAt) {
      // Two tabs refreshing at the same moment both present the same token;
      // the second arrives just after the first rotated it. Within a short
      // grace window, and only while the session is still alive, that is
      // not theft, so issue another pair in the same family.
      if (await this.isConcurrentRefresh(storedToken)) {
        return this.issueTokens(storedToken.user, storedToken.familyId);
      }
      // Genuine reuse of an old token: potential theft. Revoke the session.
      await this.revokeFamily(storedToken.familyId);
      throw new UnauthorizedException(
        'Refresh token reuse detected. All sessions revoked.',
      );
    }

    // Check expiration
    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Rotate: the presented token is replaced by the new one.
    const now = new Date();
    storedToken.revokedAt = now;
    storedToken.rotatedAt = now;
    this.em.persist(storedToken);
    await this.em.flush();

    // Issue new tokens under the same family
    return this.issueTokens(storedToken.user, storedToken.familyId);
  }

  private async issueTokens(user: User, familyId: string) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    // Generate opaque refresh token
    const rawRefreshToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);

    const refreshExpiryDays = parseInt(
      process.env.JWT_REFRESH_EXPIRY ?? '7',
      10,
    );
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshExpiryDays);

    const refreshTokenEntity = this.em.create(RefreshToken, {
      user,
      tokenHash,
      familyId,
      expiresAt,
    });

    this.em.persist(refreshTokenEntity);
    await this.em.flush();

    return {
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  /** Revokes the session (token family) the given refresh token belongs to. */
  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (!rawRefreshToken) return;
    const storedToken = await this.em.findOne(RefreshToken, {
      tokenHash: this.hashToken(rawRefreshToken),
    });
    if (storedToken) {
      await this.revokeFamily(storedToken.familyId);
    }
  }

  private async isConcurrentRefresh(token: RefreshToken): Promise<boolean> {
    if (!token.rotatedAt) return false; // revoked by logout or reuse detection
    if (Date.now() - token.rotatedAt.getTime() > REFRESH_GRACE_MS) return false;
    // The family must still have a live token (logout revokes all of them).
    const live = await this.em.count(RefreshToken, {
      familyId: token.familyId,
      revokedAt: null,
    });
    return live > 0;
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async revokeFamily(familyId: string) {
    const tokens = await this.em.find(RefreshToken, { familyId });
    const now = new Date();
    for (const token of tokens) {
      if (!token.revokedAt) {
        token.revokedAt = now;
        this.em.persist(token);
      }
    }
    await this.em.flush();
  }
}
