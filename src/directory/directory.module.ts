import { Module } from '@nestjs/common';
import { CompanyModule } from '../company/company.module';
import { PublicDirectoryController } from './public-directory.controller';

@Module({
  imports: [CompanyModule],
  controllers: [PublicDirectoryController],
})
export class DirectoryModule {}
