import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ExhibitorController } from './exhibitor.controller';
import { ExhibitorPortalController } from './exhibitor-portal.controller';
import { ExhibitorService } from './exhibitor.service';
import { AuthModule } from '../auth/auth.module';
import { BoothModule } from '../booth/booth.module';

@Module({
  imports: [
    AuthModule,
    BoothModule,
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  ],
  controllers: [ExhibitorPortalController, ExhibitorController],
  providers: [ExhibitorService],
  exports: [ExhibitorService],
})
export class ExhibitorModule {}
