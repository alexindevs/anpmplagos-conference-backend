import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { BoothPublicController } from './booth-public.controller';
import { BoothService } from './booth.service';

@Module({
  imports: [CloudinaryModule],
  controllers: [BoothPublicController],
  providers: [BoothService],
  exports: [BoothService],
})
export class BoothModule {}
