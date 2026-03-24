import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthModule } from '../auth/auth.module';
import { AdminAdvertSlotController } from './admin-advert-slot.controller';
import { AdminBrandingSlotController } from './admin-branding-slot.controller';
import { AdvertSlotController } from './advert-slot.controller';
import { AdvertSlotService } from './advert-slot.service';
import { BrandingSlotController } from './branding-slot.controller';
import { BrandingSlotService } from './branding-slot.service';

@Module({
  imports: [
    AuthModule,
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  ],
  controllers: [
    AdvertSlotController,
    BrandingSlotController,
    AdminAdvertSlotController,
    AdminBrandingSlotController,
  ],
  providers: [AdvertSlotService, BrandingSlotService],
  exports: [AdvertSlotService, BrandingSlotService],
})
export class MarketingSlotsModule {}
