import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BoothModule } from '../booth/booth.module';
import { SponsorshipModule } from '../sponsorship/sponsorship.module';
import { SupportModule } from '../support/support.module';
import { ManualPaymentCleanupService } from './manual-payment-cleanup.service';
import { ManualPaymentService } from './manual-payment.service';
import { PaymentsController } from './payments.controller';
import { PaystackService } from './paystack.service';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    BoothModule,
    SponsorshipModule,
    forwardRef(() => SupportModule),
  ],
  controllers: [PaymentsController],
  providers: [PaystackService, ManualPaymentService, ManualPaymentCleanupService],
  exports: [PaystackService, ManualPaymentService],
})
export class PaymentsModule {}
