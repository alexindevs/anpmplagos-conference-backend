import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { MetricsService } from '../metrics/metrics.service';

const BASE_FOLDER = 'anpmplagos-conference';

@Injectable()
export class StorageService {
  private readonly provider: string;
  private s3Client: S3Client | null = null;
  private readonly bucketName: string;
  private readonly b2Endpoint: string;

  constructor(
    private readonly config: ConfigService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly metrics: MetricsService,
  ) {
    this.provider = this.config.get<string>('STORAGE_PROVIDER', 'cloudinary');
    this.bucketName = this.config.get<string>('BACKBLAZE_BUCKET_NAME', '');
    this.b2Endpoint = (
      this.config.get<string>('BACKBLAZE_ENDPOINT', '') || ''
    ).replace(/\/$/, '');

    if (this.provider === 'backblaze') {
      this.s3Client = new S3Client({
        endpoint: this.b2Endpoint,
        region: this.config.get<string>('BACKBLAZE_REGION', 'us-east-005'),
        credentials: {
          accessKeyId: this.config.getOrThrow<string>('BACKBLAZE_KEY_ID'),
          secretAccessKey: this.config.getOrThrow<string>('BACKBLAZE_APP_KEY'),
        },
        forcePathStyle: true,
      });
    }
  }

  /**
   * Upload a buffer and return the public URL.
   * Delegates to Backblaze B2 or Cloudinary based on STORAGE_PROVIDER.
   */
  async uploadBuffer(
    buffer: Buffer,
    folder: string,
    publicId: string,
    mimetype: string,
  ): Promise<string> {
    const provider = this.provider === 'backblaze' ? 'backblaze' : 'cloudinary';
    try {
      const url =
        provider === 'backblaze'
          ? await this.uploadToBackblaze(buffer, folder, publicId, mimetype)
          : await this.cloudinaryService.uploadBuffer(buffer, folder, publicId, mimetype);
      this.metrics.storageUploadsTotal.inc({ provider });
      return url;
    } catch (err) {
      this.metrics.storageUploadErrors.inc({ provider });
      throw err;
    }
  }

  /**
   * Delete a file by its public URL.
   * Auto-detects provider from the URL.
   */
  async deleteFile(fileUrl: string): Promise<void> {
    if (fileUrl.includes('res.cloudinary.com')) {
      return this.deleteFromCloudinary(fileUrl);
    }
    if (this.s3Client && fileUrl.includes(this.b2Endpoint)) {
      return this.deleteFromBackblaze(fileUrl);
    }
  }

  private async uploadToBackblaze(
    buffer: Buffer,
    folder: string,
    publicId: string,
    mimetype: string,
  ): Promise<string> {
    const uniqueId = `${publicId}-${randomUUID()}`;
    const key = `${BASE_FOLDER}/${folder}/${uniqueId}`;

    await this.s3Client!.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
      }),
    );

    return `${this.b2Endpoint}/${this.bucketName}/${key}`;
  }

  private async deleteFromBackblaze(fileUrl: string): Promise<void> {
    const prefix = `${this.b2Endpoint}/${this.bucketName}/`;
    const key = fileUrl.startsWith(prefix)
      ? fileUrl.slice(prefix.length)
      : fileUrl;

    await this.s3Client!.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
    );
  }

  private async deleteFromCloudinary(fileUrl: string): Promise<void> {
    // URL: https://res.cloudinary.com/{cloud}/image/upload/v{ver}/{public_id}.{ext}
    const match = fileUrl.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^./]+)?$/);
    if (!match) return;
    const publicId = match[1];
    await new Promise<void>((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}
