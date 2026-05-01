import { Module } from '@nestjs/common';
import { ReceiptsController } from './receipts.controller';
import { ReceiptsService } from './receipts.service';
import { ReceiptFormatterService } from './receipt-formatter.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ReceiptsController],
  providers: [ReceiptsService, ReceiptFormatterService],
  exports: [ReceiptsService, ReceiptFormatterService],
})
export class ReceiptsModule {}
