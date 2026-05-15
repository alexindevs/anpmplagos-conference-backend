import { Injectable } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { RegistrationFiles } from './registration-files.interface';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIMES = ['image/jpeg', 'image/png'];

@Injectable()
export class RegistrationStorageService {
  constructor(private readonly storage: StorageService) {}

  async saveRegistrationImages(
    userId: string,
    files: RegistrationFiles,
  ): Promise<{
    avatar?: string;
    headerImage?: string;
    logo?: string;
  }> {
    const result: {
      avatar?: string;
      headerImage?: string;
      logo?: string;
    } = {};
    const folder = `registrations/${userId}`;

    if (files.avatar?.[0]) {
      const file = files.avatar[0];
      if (ALLOWED_MIMES.includes(file.mimetype) && file.size <= MAX_FILE_SIZE) {
        result.avatar = await this.storage.uploadBuffer(
          file.buffer,
          folder,
          'avatar',
          file.mimetype,
        );
      }
    }

    if (files.headerImage?.[0]) {
      const file = files.headerImage[0];
      if (ALLOWED_MIMES.includes(file.mimetype) && file.size <= MAX_FILE_SIZE) {
        result.headerImage = await this.storage.uploadBuffer(
          file.buffer,
          folder,
          'header',
          file.mimetype,
        );
      }
    }

    if (files.logo?.[0]) {
      const file = files.logo[0];
      if (ALLOWED_MIMES.includes(file.mimetype) && file.size <= MAX_FILE_SIZE) {
        result.logo = await this.storage.uploadBuffer(
          file.buffer,
          folder,
          'logo',
          file.mimetype,
        );
      }
    }

    return result;
  }
}
