import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateAdvertSlotMultipartDto } from './dto/create-advert-slot-multipart.dto';

const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export type AdvertSlotAdminListItem = {
  id: string;
  title: string;
  image: string;
  price: number;
  description: string | null;
  isTaken: boolean;
  isReserved: boolean;
  takenBy: { id: string; name: string; slug: string } | null;
};

@Injectable()
export class AdvertSlotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  findAvailable() {
    const now = new Date();
    return this.prisma.advertSlot.findMany({
      where: {
        isTaken: false,
        isReserved: false,
        sponsorshipPlanLinks: { none: {} },
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
      orderBy: [{ createdAt: 'asc' }],
    });
  }

  findMineSanitized(companyId: string) {
    return this.prisma.advertSlot.findMany({
      where: { takenById: companyId, isTaken: true },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        image: true,
        price: true,
        description: true,
        isReserved: true,
        isTaken: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  private mapAdminRow(r: {
    id: string;
    title: string;
    image: string;
    price: number;
    description: string | null;
    isTaken: boolean;
    isReserved: boolean;
    takenBy: {
      id: string;
      companyName: string;
      slug: string;
    } | null;
  }): AdvertSlotAdminListItem {
    return {
      id: r.id,
      title: r.title,
      image: r.image,
      price: r.price,
      description: r.description,
      isTaken: r.isTaken,
      isReserved: r.isReserved,
      takenBy: r.takenBy
        ? {
            id: r.takenBy.id,
            name: r.takenBy.companyName,
            slug: r.takenBy.slug,
          }
        : null,
    };
  }

  async findOneForAdmin(id: string): Promise<AdvertSlotAdminListItem> {
    const r = await this.prisma.advertSlot.findUnique({
      where: { id },
      include: {
        takenBy: { select: { id: true, companyName: true, slug: true } },
      },
    });
    if (!r) {
      throw new NotFoundException(`Advert slot ${id} not found`);
    }
    return this.mapAdminRow(r);
  }

  async findAllForAdmin(): Promise<AdvertSlotAdminListItem[]> {
    const rows = await this.prisma.advertSlot.findMany({
      orderBy: [{ createdAt: 'desc' }],
      include: {
        takenBy: { select: { id: true, companyName: true, slug: true } },
      },
    });
    return rows.map((row) => this.mapAdminRow(row));
  }

  async createFromMultipart(
    dto: CreateAdvertSlotMultipartDto,
    file?: Express.Multer.File,
  ) {
    let image = dto.advertSlotImageUrl?.trim() || undefined;

    if (file?.buffer?.length) {
      if (file.mimetype !== 'image/jpeg' && file.mimetype !== 'image/png') {
        throw new BadRequestException(
          'advertSlotImage must be a JPEG or PNG image',
        );
      }
      if (file.size > IMAGE_MAX_BYTES) {
        throw new BadRequestException('advertSlotImage must be at most 5MB');
      }
      image = await this.cloudinary.uploadBuffer(
        file.buffer,
        'advert-slots',
        'advert-slot',
        file.mimetype,
      );
    }

    if (!image) {
      throw new BadRequestException(
        'Provide advertSlotImage file or advertSlotImageUrl',
      );
    }

    return this.prisma.advertSlot.create({
      data: {
        title: dto.title,
        price: dto.price,
        description: dto.description,
        image,
        isReserved: dto.isReserved ?? false,
      },
    });
  }

  async reserve(id: string) {
    const s = await this.prisma.advertSlot.findUnique({ where: { id } });
    if (!s) {
      throw new NotFoundException(`Advert slot ${id} not found`);
    }
    if (s.isTaken) {
      throw new BadRequestException('Slot is already purchased');
    }
    return this.prisma.advertSlot.update({
      where: { id },
      data: { isReserved: true },
    });
  }

  async unreserve(id: string) {
    const s = await this.prisma.advertSlot.findUnique({ where: { id } });
    if (!s) {
      throw new NotFoundException(`Advert slot ${id} not found`);
    }
    return this.prisma.advertSlot.update({
      where: { id },
      data: { isReserved: false },
    });
  }

  async remove(id: string) {
    const s = await this.prisma.advertSlot.findUnique({ where: { id } });
    if (!s) {
      throw new NotFoundException(`Advert slot ${id} not found`);
    }
    if (s.isTaken) {
      throw new BadRequestException('Cannot delete a purchased slot');
    }
    const pending = await this.prisma.payment.findFirst({
      where: {
        kind: 'advert_slot',
        advertSlotId: id,
        status: 'pending',
      },
    });
    if (pending) {
      throw new BadRequestException(
        'Cannot delete: there is a pending payment for this slot',
      );
    }
    await this.prisma.advertSlot.delete({ where: { id } });
    return { deleted: true };
  }

  /** Admin assigns a slot to a company without Paystack (same as booth assign). */
  async assignAdmin(
    companyId: string,
    advertSlotId: string,
  ): Promise<AdvertSlotAdminListItem> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException(`Company ${companyId} not found`);
    }
    const slot = await this.prisma.advertSlot.findUnique({
      where: { id: advertSlotId },
    });
    if (!slot) {
      throw new NotFoundException(`Advert slot ${advertSlotId} not found`);
    }
    if (slot.isReserved) {
      throw new BadRequestException('Slot is reserved and cannot be assigned');
    }
    if (slot.isTaken && slot.takenById !== companyId) {
      throw new BadRequestException('Slot is already taken by another company');
    }
    if (!slot.isTaken || slot.takenById !== companyId) {
      await this.prisma.advertSlot.update({
        where: { id: advertSlotId },
        data: { isTaken: true, takenById: companyId },
      });
    }
    return this.findOneForAdmin(advertSlotId);
  }

  async unassignAdmin(companyId: string, advertSlotId: string) {
    const slot = await this.prisma.advertSlot.findUnique({
      where: { id: advertSlotId },
    });
    if (!slot) {
      throw new NotFoundException(`Advert slot ${advertSlotId} not found`);
    }
    if (!slot.isTaken || slot.takenById !== companyId) {
      throw new BadRequestException(
        'This advert slot is not assigned to that company',
      );
    }
    await this.prisma.advertSlot.update({
      where: { id: advertSlotId },
      data: { isTaken: false, takenById: null },
    });
    return { ok: true };
  }
}
