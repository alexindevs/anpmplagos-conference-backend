import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Booth,
  Prisma,
  RegistrationStatus,
  SponsorTier,
} from '@prisma/client';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateBoothMultipartDto } from './dto/create-booth-multipart.dto';

const BOOTH_IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5MB

/** Occupant when a booth is held by an exhibitor or sponsor (admin / dashboard). */
export type BoothAdminOccupant = {
  kind: 'exhibitor' | 'sponsor';
  id: string;
  name: string;
  slug: string;
};

/** One booth row with optional occupant — used by admin list and dashboard summary. */
export type BoothAdminListItem = {
  id: string;
  name: string;
  size: string;
  price: number;
  boothImage: string | null;
  description: string | null;
  tier: SponsorTier | null;
  isTaken: boolean;
  isReserved: boolean;
  takenBy: BoothAdminOccupant | null;
};

@Injectable()
export class BoothService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async findAvailable(): Promise<Booth[]> {
    return this.prisma.booth.findMany({
      where: { isTaken: false, isReserved: false },
      orderBy: [{ name: 'asc' }],
    });
  }

  async findById(id: string): Promise<Booth | null> {
    return this.prisma.booth.findUnique({
      where: { id },
      include: { takenBy: true },
    });
  }

  async findMany(args?: Prisma.BoothFindManyArgs): Promise<Booth[]> {
    return this.prisma.booth.findMany(args);
  }

  /**
   * All booths for admin UIs: full inventory with **`takenBy`** (exhibitor or sponsor) when assigned.
   */
  async findAllForAdmin(): Promise<BoothAdminListItem[]> {
    const boothRows = await this.prisma.booth.findMany({
      orderBy: [{ tier: 'asc' }, { name: 'asc' }],
      include: {
        takenBy: {
          select: { id: true, companyName: true, slug: true },
        },
        sponsorTakenBy: {
          select: { id: true, companyName: true, slug: true },
        },
      },
    });

    return boothRows.map((b) => {
      let takenBy: BoothAdminOccupant | null = null;
      if (b.takenBy) {
        takenBy = {
          kind: 'exhibitor',
          id: b.takenBy.id,
          name: b.takenBy.companyName,
          slug: b.takenBy.slug,
        };
      } else if (b.sponsorTakenBy) {
        takenBy = {
          kind: 'sponsor',
          id: b.sponsorTakenBy.id,
          name: b.sponsorTakenBy.companyName,
          slug: b.sponsorTakenBy.slug,
        };
      }

      return {
        id: b.id,
        name: b.name,
        size: b.size,
        price: b.price,
        boothImage: b.boothImage,
        description: b.description,
        tier: b.tier,
        isTaken: b.isTaken,
        isReserved: b.isReserved,
        takenBy,
      };
    });
  }

  async create(data: {
    name: string;
    size: string;
    price: number;
    description?: string;
    tier?: SponsorTier;
    isReserved?: boolean;
    boothImage?: string | null;
  }): Promise<Booth> {
    return this.prisma.booth.create({
      data: {
        name: data.name,
        size: data.size,
        price: data.price,
        description: data.description,
        tier: data.tier,
        isReserved: data.isReserved ?? false,
        boothImage: data.boothImage ?? undefined,
      },
    });
  }

  /**
   * Create booth from multipart: upload **`boothImage`** to Cloudinary, or use **`boothImageUrl`**.
   * At least one of file or URL must be provided.
   */
  async createFromMultipart(
    dto: CreateBoothMultipartDto,
    file?: Express.Multer.File | undefined,
  ): Promise<Booth> {
    let boothImage: string | undefined = dto.boothImageUrl?.trim() || undefined;

    if (file?.buffer?.length) {
      if (file.mimetype !== 'image/jpeg' && file.mimetype !== 'image/png') {
        throw new BadRequestException(
          'boothImage must be a JPEG or PNG image',
        );
      }
      if (file.size > BOOTH_IMAGE_MAX_BYTES) {
        throw new BadRequestException('boothImage must be at most 5MB');
      }
      boothImage = await this.cloudinary.uploadBuffer(
        file.buffer,
        'booths',
        'booth',
        file.mimetype,
      );
    }

    if (!boothImage) {
      throw new BadRequestException(
        'Provide a boothImage file or boothImageUrl',
      );
    }

    return this.create({
      name: dto.name,
      size: dto.size,
      price: dto.price,
      description: dto.description,
      tier: dto.tier,
      isReserved: dto.isReserved,
      boothImage,
    });
  }

  /**
   * Public directory of **assigned** booths only (`isTaken: true`) with slot tier and occupant.
   */
  async findPublicDirectory() {
    const publicBoothQuery = Prisma.validator<Prisma.BoothFindManyArgs>()({
      where: { isTaken: true },
      orderBy: [{ tier: 'asc' }, { name: 'asc' }],
      include: {
        takenBy: {
          select: {
            id: true,
            companyName: true,
            slug: true,
            tier: true,
            user: { select: { registrationStatus: true } },
          },
        },
        sponsorTakenBy: {
          select: {
            id: true,
            companyName: true,
            slug: true,
            tier: true,
          },
        },
      },
    });

    type BoothPublicRow = Prisma.BoothGetPayload<{
      include: NonNullable<typeof publicBoothQuery.include>;
    }>;

    const rows: BoothPublicRow[] = await this.prisma.booth.findMany(
      publicBoothQuery,
    );

    return rows.map((b) => {
      type Occupant = {
        kind: 'exhibitor' | 'sponsor';
        companyName: string;
        slug: string;
        /** Exhibitor/sponsor organisation tier (may differ from booth slot tier) */
        tier: SponsorTier | null;
      };

      let occupiedBy: Occupant | null = null;

      if (b.takenBy) {
        if (b.takenBy.user.registrationStatus === RegistrationStatus.registered) {
          occupiedBy = {
            kind: 'exhibitor',
            companyName: b.takenBy.companyName,
            slug: b.takenBy.slug,
            tier: b.takenBy.tier,
          };
        }
      } else if (b.sponsorTakenBy) {
        occupiedBy = {
          kind: 'sponsor',
          companyName: b.sponsorTakenBy.companyName,
          slug: b.sponsorTakenBy.slug,
          tier: b.sponsorTakenBy.tier,
        };
      }

      return {
        id: b.id,
        name: b.name,
        size: b.size,
        price: b.price,
        boothImage: b.boothImage,
        description: b.description,
        /** Tier of this booth slot / zone (set by admin) */
        slotTier: b.tier,
        isTaken: b.isTaken,
        isReserved: b.isReserved,
        occupiedBy,
      };
    });
  }

  async assignToExhibitor(
    boothId: string,
    exhibitorId: string,
  ): Promise<Booth> {
    const booth = await this.findById(boothId);
    if (!booth) {
      throw new NotFoundException(`Booth ${boothId} not found`);
    }
    if (booth.isTaken) {
      throw new Error('Booth is already taken');
    }
    if (booth.isReserved) {
      throw new Error('Booth is reserved');
    }

    return this.prisma.booth.update({
      where: { id: boothId },
      data: {
        isTaken: true,
        takenById: exhibitorId,
      },
      include: { takenBy: true },
    });
  }

  async release(boothId: string): Promise<Booth> {
    const booth = await this.findById(boothId);
    if (!booth) {
      throw new NotFoundException(`Booth ${boothId} not found`);
    }

    return this.prisma.booth.update({
      where: { id: boothId },
      data: {
        isTaken: false,
        takenById: null,
      },
    });
  }

  async reserve(boothId: string): Promise<Booth> {
    const booth = await this.findById(boothId);
    if (!booth) {
      throw new NotFoundException(`Booth ${boothId} not found`);
    }
    if (booth.isTaken) {
      throw new Error('Cannot reserve a booth that is already taken');
    }
    return this.prisma.booth.update({
      where: { id: boothId },
      data: { isReserved: true },
      include: { takenBy: true },
    });
  }

  async unreserve(boothId: string): Promise<Booth> {
    const booth = await this.findById(boothId);
    if (!booth) {
      throw new NotFoundException(`Booth ${boothId} not found`);
    }
    return this.prisma.booth.update({
      where: { id: boothId },
      data: { isReserved: false },
      include: { takenBy: true },
    });
  }
}
