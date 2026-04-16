import { Module, forwardRef } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CompanyController } from './company.controller';
import { CompanyPortalController } from './company-portal.controller';
import { CompanyAdminController } from './company-admin.controller';
import { AdminSponsorshipPlanController } from './admin-sponsorship-plan.controller';
import { CompanyService } from './company.service';
import { AuthModule } from '../auth/auth.module';
import { BoothModule } from '../booth/booth.module';
import { MarketingSlotsModule } from '../marketing-slots/marketing-slots.module';
import { MemberSheetsModule } from '../member-sheets/member-sheets.module';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    BoothModule,
    MarketingSlotsModule,
    MemberSheetsModule,
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  ],
  controllers: [
    CompanyPortalController,
    CompanyController,
    CompanyAdminController,
    AdminSponsorshipPlanController,
  ],
  providers: [CompanyService],
  exports: [CompanyService],
})
export class CompanyModule {}
