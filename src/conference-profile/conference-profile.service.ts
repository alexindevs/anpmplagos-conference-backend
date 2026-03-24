import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  ConferenceProfile,
  ConferenceProfileHighlightType,
  ConferenceProfileKind,
} from '@prisma/client';
import type { Express } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateConferenceProfileMultipartDto } from './dto/create-conference-profile-multipart.dto';
import { UpdateConferenceProfileMultipartDto } from './dto/update-conference-profile-multipart.dto';

const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png']);

const publicSelect = {
  id: true,
  kind: true,
  slug: true,
  name: true,
  profilePicture: true,
  role: true,
  qualifications: true,
  byline: true,
  highlightType: true,
  description: true,
  websiteLink: true,
  facebookLink: true,
  xLink: true,
  instagramLink: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type ConferenceProfilePublic = Pick<
  ConferenceProfile,
  | 'id'
  | 'kind'
  | 'slug'
  | 'name'
  | 'profilePicture'
  | 'role'
  | 'qualifications'
  | 'byline'
  | 'highlightType'
  | 'description'
  | 'websiteLink'
  | 'facebookLink'
  | 'xLink'
  | 'instagramLink'
  | 'createdAt'
  | 'updatedAt'
>;

@Injectable()
export class ConferenceProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  private async generateUniqueSlug(
    kind: ConferenceProfileKind,
    source: string,
  ): Promise<string> {
    const normalized = this.slugify(source);
    const base = normalized.length ? normalized : `${kind}-${Date.now()}`;
    let candidate = base;
    let suffix = 1;

    while (true) {
      const existing = await this.prisma.conferenceProfile.findUnique({
        where: { kind_slug: { kind, slug: candidate } },
        select: { id: true },
      });
      if (!existing) {
        return candidate;
      }
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }
  }

  private async generateUniqueSlugExcluding(
    kind: ConferenceProfileKind,
    source: string,
    excludeId: string,
  ): Promise<string> {
    const normalized = this.slugify(source);
    const base = normalized.length ? normalized : `${kind}-${Date.now()}`;
    let candidate = base;
    let suffix = 1;

    while (true) {
      const existing = await this.prisma.conferenceProfile.findFirst({
        where: {
          kind,
          slug: candidate,
          NOT: { id: excludeId },
        },
        select: { id: true },
      });
      if (!existing) {
        return candidate;
      }
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }
  }

  private assertImage(file: Express.Multer.File | undefined): void {
    if (!file?.buffer?.length) {
      throw new BadRequestException(
        'Image file is required (field name: `image`, JPEG or PNG, max 5MB)',
      );
    }
    if (file.size > IMAGE_MAX_BYTES) {
      throw new BadRequestException('Image must be at most 5MB');
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException('Only JPEG and PNG images are allowed');
    }
  }

  private async uploadImage(
    file: Express.Multer.File,
    kind: ConferenceProfileKind,
  ): Promise<string> {
    return this.cloudinary.uploadBuffer(
      file.buffer,
      'conference-profiles',
      kind,
      file.mimetype,
    );
  }

  async createFromMultipart(
    kind: ConferenceProfileKind,
    dto: CreateConferenceProfileMultipartDto,
    file: Express.Multer.File | undefined,
  ): Promise<ConferenceProfilePublic> {
    this.assertImage(file);
    const slug = await this.generateUniqueSlug(kind, dto.name);
    const profilePicture = await this.uploadImage(file!, kind);

    return this.prisma.conferenceProfile.create({
      data: {
        kind,
        slug,
        name: dto.name,
        profilePicture,
        role: dto.role,
        qualifications: dto.qualifications,
        byline: dto.byline,
        highlightType: dto.highlightType as ConferenceProfileHighlightType,
        description: dto.description,
        websiteLink: dto.websiteLink ?? undefined,
        facebookLink: dto.facebookLink ?? undefined,
        xLink: dto.xLink ?? undefined,
        instagramLink: dto.instagramLink ?? undefined,
      },
      select: publicSelect,
    });
  }

  async findAllPublicByKind(
    kind: ConferenceProfileKind,
  ): Promise<ConferenceProfilePublic[]> {
    return this.prisma.conferenceProfile.findMany({
      where: { kind },
      orderBy: [{ highlightType: 'asc' }, { name: 'asc' }],
      select: publicSelect,
    });
  }

  async findBySlugPublic(
    kind: ConferenceProfileKind,
    slug: string,
  ): Promise<ConferenceProfilePublic> {
    const row = await this.prisma.conferenceProfile.findUnique({
      where: { kind_slug: { kind, slug } },
      select: publicSelect,
    });
    if (!row) {
      throw new NotFoundException(`Profile "${slug}" not found`);
    }
    return row;
  }

  async findOneAdmin(
    id: string,
    kind: ConferenceProfileKind,
  ): Promise<ConferenceProfilePublic> {
    const row = await this.prisma.conferenceProfile.findFirst({
      where: { id, kind },
      select: publicSelect,
    });
    if (!row) {
      throw new NotFoundException(`Profile ${id} not found`);
    }
    return row;
  }

  async updateFromMultipart(
    id: string,
    kind: ConferenceProfileKind,
    dto: UpdateConferenceProfileMultipartDto,
    file: Express.Multer.File | undefined,
  ): Promise<ConferenceProfilePublic> {
    const current = await this.prisma.conferenceProfile.findFirst({
      where: { id, kind },
      select: { id: true, name: true },
    });
    if (!current) {
      throw new NotFoundException(`Profile ${id} not found`);
    }

    const data: Prisma.ConferenceProfileUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = dto.name;
      if (dto.name !== current.name) {
        data.slug = await this.generateUniqueSlugExcluding(
          kind,
          dto.name,
          id,
        );
      }
    }
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.qualifications !== undefined) {
      data.qualifications = dto.qualifications;
    }
    if (dto.byline !== undefined) data.byline = dto.byline;
    if (dto.highlightType !== undefined) {
      data.highlightType = dto.highlightType as ConferenceProfileHighlightType;
    }
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.websiteLink !== undefined) data.websiteLink = dto.websiteLink;
    if (dto.facebookLink !== undefined) data.facebookLink = dto.facebookLink;
    if (dto.xLink !== undefined) data.xLink = dto.xLink;
    if (dto.instagramLink !== undefined) {
      data.instagramLink = dto.instagramLink;
    }

    if (file?.buffer?.length) {
      if (file.size > IMAGE_MAX_BYTES) {
        throw new BadRequestException('Image must be at most 5MB');
      }
      if (!ALLOWED_MIME.has(file.mimetype)) {
        throw new BadRequestException('Only JPEG and PNG images are allowed');
      }
      data.profilePicture = await this.uploadImage(file, kind);
    }

    if (Object.keys(data).length === 0) {
      return this.findOneAdmin(id, kind);
    }

    return this.prisma.conferenceProfile.update({
      where: { id },
      data,
      select: publicSelect,
    });
  }

  async remove(id: string, kind: ConferenceProfileKind) {
    await this.findOneAdmin(id, kind);
    await this.prisma.conferenceProfile.delete({ where: { id } });
    return { message: 'Conference profile deleted', id };
  }

  countByKind(kind: ConferenceProfileKind): Promise<number> {
    return this.prisma.conferenceProfile.count({ where: { kind } });
  }
}
