import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { SignOptions } from 'jsonwebtoken';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AdminGuard } from './guards/admin.guard';
import { ModeratorGuard } from './guards/moderator.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { TierGateGuard } from './guards/tier-gate.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { CompanyModule } from '../company/company.module';
import { SupportModule } from '../support/support.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (config.get('JWT_ACCESS_EXPIRES_IN', '15m') ??
            '15m') as SignOptions['expiresIn'],
        },
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => CompanyModule),
    forwardRef(() => SupportModule),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    AdminGuard,
    ModeratorGuard,
    TierGateGuard,
  ],
  exports: [AuthService, JwtAuthGuard, AdminGuard, ModeratorGuard, TierGateGuard],
})
export class AuthModule {}
