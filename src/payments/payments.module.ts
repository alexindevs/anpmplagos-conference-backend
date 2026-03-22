import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PaymentsController } from './payments.controller';
import { PaystackService } from './paystack.service';

@Module({
  imports: [AuthModule],
  controllers: [PaymentsController],
  providers: [PaystackService],
  exports: [PaystackService],
})
export class PaymentsModule {}
