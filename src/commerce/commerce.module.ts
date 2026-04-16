import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PaymentsModule } from '../payments/payments.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SponsorshipModule } from '../sponsorship/sponsorship.module';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { CheckoutHoldCleanupService } from './checkout-hold-cleanup.service';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

@Module({
  imports: [PrismaModule, AuthModule, PaymentsModule, SponsorshipModule],
  controllers: [CartController, OrderController],
  providers: [CartService, OrderService, CheckoutHoldCleanupService],
  exports: [CartService, OrderService],
})
export class CommerceModule {}
