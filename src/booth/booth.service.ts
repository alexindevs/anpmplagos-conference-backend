import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Booth, Prisma, RegistrationStatus, SponsorTier } from '@prisma/client';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateBoothMultipartDto } from './dto/create-booth-multipart.dto';
import { effectiveDisplayTier, tierRank } from '../company/company-tier.util';

const BOOTH_IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5MB

/** Occupant when a booth is held by a company (admin / dashboard). */
export type BoothAdminOccupant = {
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

  /**
   * Booths purchasable standalone (cart / booth payment): **silver** and **bronze** only.
   * Higher tiers are assigned via sponsorship bundle fulfillment, not listed here.
   */
  async findAvailable(): Promise<Booth[]> {
    const now = new Date();
    return this.prisma.booth.findMany({
      where: {
        isTaken: false,
        isReserved: false,
        tier: { in: [SponsorTier.silver, SponsorTier.bronze] },
        NOT: {
          AND: [
            { checkoutHoldExpiresAt: { gt: now } },
            {
              OR: [
                { checkoutHoldOrderId: { not: null } },
                { checkoutHoldPaymentId: { not: null } },
              ],
            },
          ],
        },
      },
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
   * All booths for admin UIs: full inventory with **`takenBy`** (company) when assigned.
   */
  async findAllForAdmin(): Promise<BoothAdminListItem[]> {
    const boothRows = await this.prisma.booth.findMany({
      orderBy: [{ tier: 'asc' }, { name: 'asc' }],
      include: {
        takenBy: {
          select: { id: true, companyName: true, slug: true },
        },
      },
    });

    return boothRows.map((b) => {
      const takenBy = b.takenBy
        ? {
            id: b.takenBy.id,
            name: b.takenBy.companyName,
            slug: b.takenBy.slug,
          }
        : null;

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
    file?: Express.Multer.File,
  ): Promise<Booth> {
    let boothImage: string | undefined = dto.boothImageUrl?.trim() || undefined;

    if (file?.buffer?.length) {
      if (file.mimetype !== 'image/jpeg' && file.mimetype !== 'image/png') {
        throw new BadRequestException('boothImage must be a JPEG or PNG image');
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
            highestSponsorshipTier: true,
            booth: { select: { tier: true } },
            user: { select: { registrationStatus: true } },
          },
        },
      },
    });

    type BoothPublicRow = Prisma.BoothGetPayload<{
      include: NonNullable<typeof publicBoothQuery.include>;
    }>;

    const rows: BoothPublicRow[] =
      await this.prisma.booth.findMany(publicBoothQuery);

    return rows.map((b) => {
      type Occupant = {
        companyName: string;
        slug: string;
        effectiveDisplayTier: SponsorTier;
      };

      let occupiedBy: Occupant | null = null;

      if (b.takenBy) {
        if (
          b.takenBy.user.registrationStatus === RegistrationStatus.registered
        ) {
          occupiedBy = {
            companyName: b.takenBy.companyName,
            slug: b.takenBy.slug,
            effectiveDisplayTier: effectiveDisplayTier(b.takenBy),
          };
        }
      }

      return {
        id: b.id,
        name: b.name,
        size: b.size,
        price: b.price,
        boothImage: b.boothImage,
        description: b.description,
        slotTier: b.tier,
        isTaken: b.isTaken,
        isReserved: b.isReserved,
        occupiedBy,
      };
    });
  }

  async assignToCompany(boothId: string, companyId: string): Promise<Booth> {
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

    const updated = await this.prisma.booth.update({
      where: { id: boothId },
      data: {
        isTaken: true,
        takenById: companyId,
      },
      include: { takenBy: true },
    });
    await this.applyBoothTierToCompany(companyId, updated.tier);
    return updated;
  }

  /**
   * When a booth has it's own tier, the exhibitor's stored tier becomes that value
   */
  async applyBoothTierToCompany(
    companyId: string,
    boothTier: SponsorTier | null | undefined,
  ): Promise<void> {
    if (boothTier == null) {
      return;
    }

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { highestSponsorshipTier: true },
    });

    if (!company) {
      return;
    }

    const currentTier = company.highestSponsorshipTier ?? SponsorTier.default;

    if (tierRank(boothTier) > tierRank(currentTier)) {
      await this.prisma.company.update({
        where: { id: companyId },
        data: { highestSponsorshipTier: boothTier },
      });
    }
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
