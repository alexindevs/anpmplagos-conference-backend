import { Module } from '@nestjs/common';
import { PanelController } from './panel.controller';
import { PanelService } from './panel.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PanelController],
  providers: [PanelService],
  exports: [PanelService],
})
export class PanelModule {}
