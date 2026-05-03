import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { SignOptions } from 'jsonwebtoken';
import { AdminBoothController } from './admin-booth.controller';
import { AdminController } from './admin.controller';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminProfileController } from './admin-profile.controller';
import { AdminModeratorsController } from './admin-moderators.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminService } from './admin.service';
import { AdminStorageService } from './admin-storage.service';
import { AdminModeratorsService } from './admin-moderators.service';
import { AuthModule } from '../auth/auth.module';
import { BoothModule } from '../booth/booth.module';
import { SupportModule } from '../support/support.module';

@Module({
  imports: [
    AuthModule,
    BoothModule,
    forwardRef(() => SupportModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
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
    AdminModeratorsController,
  ],
  providers: [AdminService, AdminStorageService, AdminDashboardService, AdminModeratorsService],
  exports: [AdminService],
})
export class AdminModule {}
