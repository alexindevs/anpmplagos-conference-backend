import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { AdminGalleryController } from './admin-gallery.controller';
import { GalleryPublicController } from './gallery-public.controller';
import { GalleryService } from './gallery.service';

@Module({
  imports: [AuthModule, CloudinaryModule],
  controllers: [GalleryPublicController, AdminGalleryController],
  providers: [GalleryService],
  exports: [GalleryService],
})
export class GalleryModule {}
