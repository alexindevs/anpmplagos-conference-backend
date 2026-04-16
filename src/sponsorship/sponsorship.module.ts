import { Module } from '@nestjs/common';
import { SponsorshipBundleResolutionService } from './sponsorship-bundle-resolution.service';

@Module({
  providers: [SponsorshipBundleResolutionService],
  exports: [SponsorshipBundleResolutionService],
})
export class SponsorshipModule {}
