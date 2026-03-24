import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { SignOptions } from 'jsonwebtoken';
import { AdminBoothController } from './admin-booth.controller';
import { AdminController } from './admin.controller';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminProfileController } from './admin-profile.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminService } from './admin.service';
import { AdminStorageService } from './admin-storage.service';
import { AuthModule } from '../auth/auth.module';
import { BoothModule } from '../booth/booth.module';

@Module({
  imports: [
    AuthModule,
    BoothModule,
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
    MulterModule.register({
      storage: memoryStorage(),
    }),
  ],
  controllers: [
    AdminController,
    AdminBoothController,
    AdminDashboardController,
    AdminProfileController,
  ],
  providers: [AdminService, AdminStorageService, AdminDashboardService],
  exports: [AdminService],
})
export class AdminModule {}
