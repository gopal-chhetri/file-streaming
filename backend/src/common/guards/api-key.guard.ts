import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { timingSafeEqual } from 'node:crypto';

/** Constant-time string comparison (lengths may differ). */
export function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Authenticates the transcoding worker's status callbacks. There is no
 * default token: without WORKER_API_TOKEN every request is refused, since a
 * well-known default would let anyone mark videos live or failed.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-api-key'];
    const expectedKey = this.configService.get<string>('app.workerApiToken');

    if (!expectedKey || typeof apiKey !== 'string' || !secretsMatch(apiKey, expectedKey)) {
      throw new UnauthorizedException('Invalid or missing API key');
    }
    return true;
  }
}
