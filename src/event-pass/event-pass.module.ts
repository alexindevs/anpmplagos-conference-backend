import { Module } from '@nestjs/common';
import { EventPassController } from './event-pass.controller';
import { EventPassService } from './event-pass.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [PrismaModule, CloudinaryModule],
  controllers: [EventPassController],
  providers: [EventPassService],
  exports: [EventPassService],
})
export class EventPassModule {}
