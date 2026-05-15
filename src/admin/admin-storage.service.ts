import { Injectable } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIMES = ['image/jpeg', 'image/png'];

export interface AdminAvatarFile {
  fieldname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class AdminStorageService {
  constructor(private readonly storage: StorageService) {}

  async saveAdminAvatar(
    userId: string,
    file?: AdminAvatarFile,
  ): Promise<string | undefined> {
    if (
      !file ||
      !ALLOWED_MIMES.includes(file.mimetype) ||
      file.size > MAX_FILE_SIZE
    ) {
      return undefined;
    }
    return this.storage.uploadBuffer(
      file.buffer,
      `admins/${userId}`,
      'avatar',
      file.mimetype,
    );
  }
}
