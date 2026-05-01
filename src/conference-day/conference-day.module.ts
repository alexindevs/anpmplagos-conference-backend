import { Module } from '@nestjs/common';
import { ConferenceDayController } from './conference-day.controller';
import { ConferenceDayService } from './conference-day.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ConferenceDayController],
  providers: [ConferenceDayService],
  exports: [ConferenceDayService],
})
export class ConferenceDayModule {}
