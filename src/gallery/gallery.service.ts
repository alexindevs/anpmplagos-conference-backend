import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { MetricsService } from '../metrics/metrics.service';
import { CreateGalleryItemMultipartDto } from './dto/create-gallery-item-multipart.dto';
import type { Express } from 'express';

const GALLERY_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png']);

@Injectable()
export class GalleryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly metrics: MetricsService,
  ) {}

  async createFromMultipart(
    dto: CreateGalleryItemMultipartDto,
    file: Express.Multer.File | undefined,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException(
        'Image file is required (field name: `image`, JPEG or PNG, max 5MB)',
      );
    }
    if (file.size > GALLERY_IMAGE_MAX_BYTES) {
      throw new BadRequestException('Image must be at most 5MB');
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException('Only JPEG and PNG images are allowed');
    }

    const imageUrl = await this.storage.uploadBuffer(
      file.buffer,
      'gallery',
      'item',
      file.mimetype,
    );
    this.metrics.galleryUploadsTotal.inc();

    return this.prisma.galleryItem.create({
      data: {
        imageUrl,
        caption: dto.caption ?? '',
      },
    });
  }

  findAllPublic() {
    return this.prisma.galleryItem.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.galleryItem.findUnique({
      where: { id },
    });
    if (!item) {
      throw new NotFoundException(`Gallery item ${id} not found`);
    }
    return item;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.galleryItem.delete({ where: { id } });
    return { message: 'Gallery item deleted', id };
  }
}
