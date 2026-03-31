import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { SignOptions } from 'jsonwebtoken';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AdminGuard } from './guards/admin.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { TierGateGuard } from './guards/tier-gate.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { CompanyModule } from '../company/company.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'fallback-secret-change-me'),
        signOptions: {
          expiresIn: (config.get('JWT_EXPIRES_IN', '7d') ??
            '7d') as SignOptions['expiresIn'],
        },
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => CompanyModule),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, AdminGuard, TierGateGuard],
  exports: [AuthService, JwtAuthGuard, AdminGuard, TierGateGuard],
})
export class AuthModule {}
