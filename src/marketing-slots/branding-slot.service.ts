import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateBrandingSlotMultipartDto } from './dto/create-branding-slot-multipart.dto';

const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export type BrandingSlotAdminListItem = {
  id: string;
  title: string;
  image: string;
  price: number;
  description: string | null;
  totalSlots: number;
  availableSlots: number;
  isReserved: boolean;
};

@Injectable()
export class BrandingSlotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  findAvailable() {
    return this.prisma.brandingSlot.findMany({
      where: {
        availableSlots: { gt: 0 },
        isReserved: false,
        sponsorshipPlanLinks: { none: {} },
      },
      orderBy: [{ createdAt: 'asc' }],
    });
  }

  findMineSanitized(companyId: string) {
    return this.prisma.brandingSlot.findMany({
      where: {
        OR: [
          { payments: { some: { companyId, status: 'success' } } },
          { companyAssignments: { some: { companyId } } },
        ],
      },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        image: true,
        price: true,
        description: true,
        isReserved: true,
        totalSlots: true,
        availableSlots: true,
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
    totalSlots: number;
    availableSlots: number;
    isReserved: boolean;
  }): BrandingSlotAdminListItem {
    return {
      id: r.id,
      title: r.title,
      image: r.image,
      price: r.price,
      description: r.description,
      totalSlots: r.totalSlots,
      availableSlots: r.availableSlots,
      isReserved: r.isReserved,
    };
  }

  async findOneForAdmin(id: string): Promise<BrandingSlotAdminListItem> {
    const r = await this.prisma.brandingSlot.findUnique({ where: { id } });
    if (!r) {
      throw new NotFoundException(`Branding slot ${id} not found`);
    }
    return this.mapAdminRow(r);
  }

  async findAllForAdmin(): Promise<BrandingSlotAdminListItem[]> {
    const rows = await this.prisma.brandingSlot.findMany({
      orderBy: [{ createdAt: 'desc' }],
    });
    return rows.map((row) => this.mapAdminRow(row));
  }

  async createFromMultipart(
    dto: CreateBrandingSlotMultipartDto,
    file?: Express.Multer.File,
  ) {
    let image = dto.brandingSlotImageUrl?.trim() || undefined;

    if (file?.buffer?.length) {
      if (file.mimetype !== 'image/jpeg' && file.mimetype !== 'image/png') {
        throw new BadRequestException(
          'brandingSlotImage must be a JPEG or PNG image',
        );
      }
      if (file.size > IMAGE_MAX_BYTES) {
        throw new BadRequestException('brandingSlotImage must be at most 5MB');
      }
      image = await this.storage.uploadBuffer(
        file.buffer,
        'branding-slots',
        'branding-slot',
        file.mimetype,
      );
    }

    if (!image) {
      throw new BadRequestException(
        'Provide brandingSlotImage file or brandingSlotImageUrl',
      );
    }

    const totalSlots = dto.totalSlots ?? 1;

    return this.prisma.brandingSlot.create({
      data: {
        title: dto.title,
        price: dto.price,
        description: dto.description,
        image,
        isReserved: dto.isReserved ?? false,
        totalSlots,
        availableSlots: totalSlots,
      },
    });
  }

  async reserve(id: string) {
    const s = await this.prisma.brandingSlot.findUnique({ where: { id } });
    if (!s) {
      throw new NotFoundException(`Branding slot ${id} not found`);
    }
    return this.prisma.brandingSlot.update({
      where: { id },
      data: { isReserved: true },
    });
  }

  async unreserve(id: string) {
    const s = await this.prisma.brandingSlot.findUnique({ where: { id } });
    if (!s) {
      throw new NotFoundException(`Branding slot ${id} not found`);
    }
    return this.prisma.brandingSlot.update({
      where: { id },
      data: { isReserved: false },
    });
  }

  async remove(id: string) {
    const s = await this.prisma.brandingSlot.findUnique({ where: { id } });
    if (!s) {
      throw new NotFoundException(`Branding slot ${id} not found`);
    }
    if (s.availableSlots < s.totalSlots) {
      throw new BadRequestException(
        'Cannot delete: some copies of this slot have been sold',
      );
    }
    const pending = await this.prisma.payment.findFirst({
      where: {
        kind: 'branding_slot',
        brandingSlotId: id,
        status: 'pending',
      },
    });
    if (pending) {
      throw new BadRequestException(
        'Cannot delete: there is a pending payment for this slot',
      );
    }
    await this.prisma.brandingSlot.delete({ where: { id } });
    return { deleted: true };
  }

  async assignAdmin(
    companyId: string,
    brandingSlotId: string,
  ): Promise<BrandingSlotAdminListItem> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException(`Company ${companyId} not found`);
    }
    const slot = await this.prisma.brandingSlot.findUnique({
      where: { id: brandingSlotId },
    });
    if (!slot) {
      throw new NotFoundException(`Branding slot ${brandingSlotId} not found`);
    }
    if (slot.isReserved) {
      throw new BadRequestException('Slot is reserved and cannot be assigned');
    }
    const result = await this.prisma.brandingSlot.updateMany({
      where: { id: brandingSlotId, availableSlots: { gt: 0 } },
      data: { availableSlots: { decrement: 1 } },
    });
    if (result.count === 0) {
      throw new ConflictException('No copies of this branding slot remain');
    }
    return this.findOneForAdmin(brandingSlotId);
  }

  async unassignAdmin(_companyId: string, brandingSlotId: string) {
    const slot = await this.prisma.brandingSlot.findUnique({
      where: { id: brandingSlotId },
    });
    if (!slot) {
      throw new NotFoundException(`Branding slot ${brandingSlotId} not found`);
    }
    if (slot.availableSlots >= slot.totalSlots) {
      throw new BadRequestException(
        'All copies of this slot are already available',
      );
    }
    await this.prisma.brandingSlot.update({
      where: { id: brandingSlotId },
      data: { availableSlots: { increment: 1 } },
    });
    return { ok: true };
  }

  async updateTotalSlots(
    id: string,
    newTotal: number,
  ): Promise<BrandingSlotAdminListItem> {
    if (!Number.isInteger(newTotal) || newTotal < 1) {
      throw new BadRequestException('totalSlots must be a positive integer');
    }
    const slot = await this.prisma.brandingSlot.findUnique({ where: { id } });
    if (!slot) {
      throw new NotFoundException(`Branding slot ${id} not found`);
    }
    const sold = slot.totalSlots - slot.availableSlots;
    if (newTotal < sold) {
      throw new BadRequestException(
        `Cannot reduce totalSlots below sold count (${sold})`,
      );
    }
    await this.prisma.brandingSlot.update({
      where: { id },
      data: {
        totalSlots: newTotal,
        availableSlots: newTotal - sold,
      },
    });
    return this.findOneForAdmin(id);
  }
}
