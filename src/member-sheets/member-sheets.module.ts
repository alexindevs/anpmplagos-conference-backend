import { Module } from '@nestjs/common';
import { MemberSheetsService } from './member-sheets.service';

@Module({
  providers: [MemberSheetsService],
  exports: [MemberSheetsService],
})
export class MemberSheetsModule {}
