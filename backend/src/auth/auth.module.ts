import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { RefreshToken } from './entities/refresh-token.entity';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { getPrivateKey, getPublicKey } from './utils/keys';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    MikroOrmModule.forFeature([RefreshToken]),
    JwtModule.register({
      privateKey: getPrivateKey(),
      publicKey: getPublicKey(),
      signOptions: {
        expiresIn: (process.env.JWT_ACCESS_EXPIRY || '15m') as any,
        algorithm: 'RS256',
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
