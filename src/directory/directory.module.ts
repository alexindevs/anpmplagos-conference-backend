import { Module } from '@nestjs/common';
import { ExhibitorModule } from '../exhibitor/exhibitor.module';
import { SponsorModule } from '../sponsor/sponsor.module';
import { PublicDirectoryController } from './public-directory.controller';

@Module({
  imports: [ExhibitorModule, SponsorModule],
  controllers: [PublicDirectoryController],
})
export class DirectoryModule {}
