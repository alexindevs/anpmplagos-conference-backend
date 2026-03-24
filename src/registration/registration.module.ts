import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthModule } from '../auth/auth.module';
import { AttendeeController } from './attendee.controller';
import { MemberController } from './member.controller';
import { ParseAndValidateRegistrationPipe } from './parse-and-validate-registration.pipe';
import { ParseRegistrationFormPipe } from './parse-registration-form.pipe';
import { AdminRegistrationsController } from './admin-registrations.controller';
import { AdminRegistrationsService } from './admin-registrations.service';
import { RegistrationController } from './registration.controller';
import { RegistrationService } from './registration.service';
import { RegistrationStorageService } from './registration-storage.service';

@Module({
  imports: [
    AuthModule,
    MulterModule.register({
      storage: memoryStorage(),
    }),
  ],
  controllers: [
    RegistrationController,
    MemberController,
    AttendeeController,
    AdminRegistrationsController,
  ],
  providers: [
    RegistrationService,
    AdminRegistrationsService,
    RegistrationStorageService,
    ParseRegistrationFormPipe,
    ParseAndValidateRegistrationPipe,
  ],
  exports: [RegistrationService],
})
export class RegistrationModule {}
