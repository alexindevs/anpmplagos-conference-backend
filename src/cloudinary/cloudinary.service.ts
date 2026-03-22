import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';

const CLOUDINARY_FOLDER = 'anpmplagos-conference';

@Injectable()
export class CloudinaryService {
  constructor(private readonly config: ConfigService) {
    cloudinary.config({
      cloud_name: this.config.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.config.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.config.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  /**
   * Upload a buffer to Cloudinary and return the secure URL.
   * @param buffer File buffer
   * @param folder Subfolder within anpmplagos-conference (e.g. 'registrations/userId', 'admins/userId')
   * @param publicId Base name for the file (e.g. 'avatar', 'header', 'profile')
   * @param mimetype MIME type (image/jpeg or image/png)
   */
  async uploadBuffer(
    buffer: Buffer,
    folder: string,
    publicId: string,
    mimetype: string,
  ): Promise<string> {
    const format = mimetype === 'image/png' ? 'png' : 'jpg';
    const fullFolder = `${CLOUDINARY_FOLDER}/${folder}`;
    const uniqueId = `${publicId}-${randomUUID()}`;

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: fullFolder,
          public_id: uniqueId,
          format,
          resource_type: 'image',
        },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }
          if (!result?.secure_url) {
            reject(new Error('Upload failed: no URL returned'));
            return;
          }
          resolve(result.secure_url);
        },
      );
      streamifier.createReadStream(buffer).pipe(stream);
    });
  }
}
