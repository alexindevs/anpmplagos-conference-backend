import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { AdminSpeakersController } from './admin-speakers.controller';
import { AdminSpecialGuestsController } from './admin-special-guests.controller';
import { ConferenceProfileService } from './conference-profile.service';
import { SpeakersPublicController } from './speakers-public.controller';
import { SpecialGuestsPublicController } from './special-guests-public.controller';

@Module({
  imports: [AuthModule, CloudinaryModule],
  controllers: [
    SpeakersPublicController,
    SpecialGuestsPublicController,
    AdminSpeakersController,
    AdminSpecialGuestsController,
  ],
  providers: [ConferenceProfileService],
  exports: [ConferenceProfileService],
})
export class ConferenceProfileModule {}
