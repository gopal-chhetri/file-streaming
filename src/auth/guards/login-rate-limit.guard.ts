import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import type { Request } from 'express';
import Redis from 'ioredis';

@Injectable()
export class LoginRateLimitGuard implements CanActivate {
  private readonly limit = 5; // max 5 attempts
  private readonly windowSeconds = 60; // per 1 minute

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const body = request.body || {};
    const usernameOrEmail = body.usernameOrEmail || '';
    
    // Fallbacks for behind proxy (like Cloudflare / Traefik)
    const ip = (request.headers['x-forwarded-for'] as string) || request.ip || 'unknown';

    if (!usernameOrEmail) {
      return true; // Let validation pipe handle missing body properties
    }

    const ipKey = `rate_limit:login:ip:${ip}`;
    const userKey = `rate_limit:login:user:${usernameOrEmail.toLowerCase()}`;

    // Perform check for IP
    await this.checkLimit(ipKey, 'Too many login attempts from this IP. Please try again in 1 minute.');
    
    // Perform check for User
    await this.checkLimit(userKey, 'Too many login attempts for this account. Please try again in 1 minute.');

    return true;
  }

  private async checkLimit(key: string, errorMessage: string): Promise<void> {
    const current = await this.redis.incr(key);
    
    if (current === 1) {
      await this.redis.expire(key, this.windowSeconds);
    }

    if (current > this.limit) {
      throw new HttpException(
        errorMessage,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
