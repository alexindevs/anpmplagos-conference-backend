import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { PrismaModule } from '../prisma/prisma.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { ElectionsService } from './elections.service';
import { AdminElectionsController } from './admin-elections.controller';
import { ElectionsController } from './elections.controller';

@Module({
  imports: [
    PrismaModule,
    CloudinaryModule,
    MulterModule.register({ storage: undefined }), // memory storage for uploads
  ],
  controllers: [AdminElectionsController, ElectionsController],
  providers: [ElectionsService],
  exports: [ElectionsService],
})
export class ElectionsModule {}
