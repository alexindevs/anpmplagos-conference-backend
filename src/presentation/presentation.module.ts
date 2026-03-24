import { Module } from '@nestjs/common';
import { PresentationController } from './presentation.controller';
import { PresentationService } from './presentation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PresentationController],
  providers: [PresentationService],
  exports: [PresentationService],
})
export class PresentationModule {}
