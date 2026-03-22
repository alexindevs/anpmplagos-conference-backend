import { Module } from '@nestjs/common';
import { SponsorController } from './sponsor.controller';
import { SponsorService } from './sponsor.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SponsorController],
  providers: [SponsorService],
  exports: [SponsorService],
})
export class SponsorModule {}
