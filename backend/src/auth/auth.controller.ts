import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Res,
  Inject,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import Redis from 'ioredis';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginRateLimitGuard } from './guards/login-rate-limit.guard';
import { User } from '../users/entities/user.entity';

/**
 * Domain for the refresh-token cookie. COOKIE_DOMAIN must be set in
 * production (validated at startup); locally it defaults to .soylab.local.
 */
export function refreshCookieDomain(): string | undefined {
  if (process.env.COOKIE_DOMAIN) return process.env.COOKIE_DOMAIN;
  return process.env.NODE_ENV === 'production' ? undefined : '.soylab.local';
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  private cookieOptions() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      domain: refreshCookieDomain(),
    };
  }

  private setRefreshTokenCookie(res: Response, token: string) {
    const refreshExpiryDays = parseInt(
      process.env.JWT_REFRESH_EXPIRY ?? '7',
      10,
    );
    res.cookie('refreshToken', token, {
      ...this.cookieOptions(),
      maxAge: refreshExpiryDays * 24 * 60 * 60 * 1000,
    });
  }

  @Post('register')
  @ApiOperation({
    summary: 'Register a new user account',
    description:
      'Registers a user, hashes the password, and returns access token + sets httpOnly refresh cookie.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered.',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Email or username already in use.',
  })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.register(dto);
    this.setRefreshTokenCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @UseGuards(LoginRateLimitGuard, LocalAuthGuard)
  @Post('login')
  @ApiOperation({
    summary: 'Log in with username/email and password',
    description:
      'Authenticates user and returns access token + sets httpOnly refresh cookie.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful.',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  @ApiResponse({ status: 429, description: 'Too many login attempts.' })
  async login(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = req.user as User;
    const tokens = await this.authService.login(user);

    // Clear rate limits upon successful login. req.ip honours "trust proxy"
    // (see main.ts); the raw X-Forwarded-For header is client-controlled.
    const ip = req.ip || 'unknown';
    const usernameOrEmail = req.body.usernameOrEmail || '';
    await this.redis.del(`rate_limit:login:ip:${ip}`);
    await this.redis.del(
      `rate_limit:login:user:${usernameOrEmail.toLowerCase()}`,
    );

    this.setRefreshTokenCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'Rotate access and refresh tokens',
    description: 'Rotates tokens using the httpOnly refresh token cookie.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens successfully rotated.',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token.',
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawRefreshToken = req.cookies?.refreshToken;
    if (!rawRefreshToken) {
      throw new HttpException(
        'Refresh token missing from cookies',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const tokens = await this.authService.refresh(rawRefreshToken);
    this.setRefreshTokenCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Post('logout')
  @ApiOperation({
    summary: 'Log out user',
    description: 'Revokes the session refresh token and clears the cookie.',
  })
  @ApiResponse({ status: 200, description: 'Logged out successfully.' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Revoke server-side: clearing the cookie alone would leave the token
    // usable for its full lifetime by anyone who copied it.
    await this.authService.logout(req.cookies?.refreshToken);
    res.clearCookie('refreshToken', this.cookieOptions());
    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Current user info.',
    type: UserResponseDto,
  })
  async getMe(@Req() req: Request) {
    const userId = (req.user as { id: string }).id;
    return this.usersService.getProfile(userId);
  }
}

// Custom exception helper for cleaner import context
import { HttpException } from '@nestjs/common';
