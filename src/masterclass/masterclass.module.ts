import { Module } from '@nestjs/common';
import { MasterclassController } from './masterclass.controller';
import { MasterclassService } from './masterclass.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [MasterclassController],
  providers: [MasterclassService],
  exports: [MasterclassService],
})
export class MasterclassModule {}
