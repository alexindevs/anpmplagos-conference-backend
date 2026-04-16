import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BoothModule } from '../booth/booth.module';
import { SponsorshipModule } from '../sponsorship/sponsorship.module';
import { PaymentsController } from './payments.controller';
import { PaystackService } from './paystack.service';

@Module({
  imports: [forwardRef(() => AuthModule), BoothModule, SponsorshipModule],
  controllers: [PaymentsController],
  providers: [PaystackService],
  exports: [PaystackService],
})
export class PaymentsModule {}
