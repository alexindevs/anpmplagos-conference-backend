import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Exhibitor, Prisma, SponsorTier } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BoothService } from '../booth/booth.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateExhibitorProductDto } from './dto/create-exhibitor-product.dto';
import type { Express } from 'express';
import { CreateExhibitorProductMultipartDto } from './dto/create-exhibitor-product-multipart.dto';
import { CreateExhibitorRepresentativeDto } from './dto/create-exhibitor-representative.dto';
import { CreatePublicExhibitorLeadDto } from './dto/create-public-exhibitor-lead.dto';
import { UpdateExhibitorProductDto } from './dto/update-exhibitor-product.dto';
import { UpdateExhibitorProfileDto } from './dto/update-exhibitor-profile.dto';
import { UpdateExhibitorRepresentativeDto } from './dto/update-exhibitor-representative.dto';

const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5MB

@Injectable()
export class ExhibitorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boothService: BoothService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async findById(
    id: string,
  ): Promise<
    | (Exhibitor & { representatives: unknown[]; booth: { id: string } | null })
    | null
  > {
    return this.prisma.exhibitor.findUnique({
      where: { id },
      include: {
        representatives: true,
        booth: true,
      },
    });
  }

  async findByUserId(
    userId: string,
  ): Promise<
    | (Exhibitor & { representatives: unknown[]; booth: { id: string } | null })
    | null
  > {
    return this.prisma.exhibitor.findUnique({
      where: { userId },
      include: {
        representatives: true,
        booth: true,
      },
    });
  }

  async selectBooth(exhibitorId: string, boothId: string) {
    const exhibitor = await this.findById(exhibitorId);
    if (!exhibitor) {
      throw new NotFoundException(`Exhibitor ${exhibitorId} not found`);
    }
    return this.boothService.assignToExhibitor(boothId, exhibitorId);
  }

  async releaseBooth(exhibitorId: string) {
    const exhibitor = await this.findById(exhibitorId);
    if (!exhibitor) {
      throw new NotFoundException(`Exhibitor ${exhibitorId} not found`);
    }
    const booth = exhibitor.booth;
    if (!booth) {
      throw new NotFoundException('Exhibitor has no booth assigned');
    }
    return this.boothService.release(booth.id);
  }

  async findPublic(filters?: { tier?: SponsorTier }) {
    return this.prisma.exhibitor.findMany({
      where: {
        user: {
          registrationStatus: 'registered',
        },
        ...(filters?.tier ? { tier: filters.tier } : {}),
      },
      select: {
        id: true,
        slug: true,
        companyName: true,
        tagline: true,
        description: true,
        tier: true,
        website: true,
        headerImage: true,
        profileImage: true,
        booth: {
          select: {
            id: true,
            name: true,
            size: true,
          },
        },
      },
      orderBy: { companyName: 'asc' },
    });
  }

  async findPublicBySlug(slug: string) {
    const exhibitor = await this.prisma.exhibitor.findFirst({
      where: {
        slug,
        user: {
          registrationStatus: 'registered',
        },
      },
      include: {
        booth: {
          select: {
            id: true,
            name: true,
            size: true,
            price: true,
            description: true,
          },
        },
        representatives: {
          select: {
            id: true,
            name: true,
            title: true,
            phone: true,
          },
        },
        products: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            name: true,
            description: true,
            imageUrl: true,
            linkUrl: true,
            sortOrder: true,
          },
        },
      },
    });

    if (!exhibitor) return null;

    return {
      id: exhibitor.id,
      slug: exhibitor.slug,
      companyName: exhibitor.companyName,
      tagline: exhibitor.tagline,
      tier: exhibitor.tier,
      boothPreference: exhibitor.boothPreference,
      website: exhibitor.website,
      contactEmail: exhibitor.contactEmail,
      primaryContactName: exhibitor.primaryContactName,
      primaryContactPhone: exhibitor.primaryContactPhone,
      description: exhibitor.description,
      headerImage: exhibitor.headerImage,
      profileImage: exhibitor.profileImage,
      booth: exhibitor.booth,
      boothReps: exhibitor.representatives,
      products: exhibitor.products,
    };
  }

  requireExhibitorAccount(regType: string, exhibitor?: { id: string } | null): string {
    if (regType !== 'exhibitor' || !exhibitor?.id) {
      throw new ForbiddenException('Exhibitor account required');
    }
    return exhibitor.id;
  }

  async getPortalProfile(exhibitorId: string) {
    const row = await this.prisma.exhibitor.findUnique({
      where: { id: exhibitorId },
      include: {
        representatives: { orderBy: { createdAt: 'asc' } },
        booth: true,
        products: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] },
      },
    });
    if (!row) {
      throw new NotFoundException('Exhibitor not found');
    }
    return row;
  }

  async updatePortalProfile(exhibitorId: string, dto: UpdateExhibitorProfileDto) {
    const data: Prisma.ExhibitorUpdateInput = {};
    const keys = [
      'companyName',
      'tagline',
      'description',
      'boothPreference',
      'website',
      'contactEmail',
      'primaryContactName',
      'primaryContactPhone',
      'hotelBookingUrl',
      'headerImage',
      'profileImage',
    ] as const;
    for (const k of keys) {
      if (dto[k] !== undefined) {
        (data as Record<string, unknown>)[k] = dto[k];
      }
    }
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields to update');
    }
    return this.prisma.exhibitor.update({
      where: { id: exhibitorId },
      data,
      include: {
        representatives: true,
        booth: true,
        products: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] },
      },
    });
  }

  async getDashboard(exhibitorId: string) {
    const exhibitor = await this.prisma.exhibitor.findUnique({
      where: { id: exhibitorId },
      include: { booth: true },
    });
    if (!exhibitor) {
      throw new NotFoundException('Exhibitor not found');
    }

    const [totalLeads, pendingBoothPayment, whatsappClicksSum] = await Promise.all([
      this.prisma.exhibitorLead.count({ where: { exhibitorId } }),
      this.prisma.payment.findFirst({
        where: {
          exhibitorId,
          kind: 'booth',
          status: 'pending',
        },
        select: {
          reference: true,
          boothId: true,
          amount: true,
          baseAmount: true,
        },
      }),
      this.prisma.exhibitorProduct.aggregate({
        where: { exhibitorId },
        _sum: { whatsappClickCount: true },
      }),
    ]);

    const views = exhibitor.profileViews;
    const inquiryRatePercent =
      views > 0 ? Math.round((totalLeads / views) * 10000) / 100 : 0;

    let boothStatus: 'none' | 'pending_payment' | 'assigned';
    if (exhibitor.booth) {
      boothStatus = 'assigned';
    } else if (pendingBoothPayment) {
      boothStatus = 'pending_payment';
    } else {
      boothStatus = 'none';
    }

    return {
      companyName: exhibitor.companyName,
      slug: exhibitor.slug,
      stats: {
        profileViews: views,
        totalLeads,
        inquiryRatePercent,
        whatsappProductClicks: whatsappClicksSum._sum.whatsappClickCount ?? 0,
      },
      booth: {
        status: boothStatus,
        assignedBooth: exhibitor.booth,
        pendingPayment: pendingBoothPayment,
      },
      hotelBookingUrl: exhibitor.hotelBookingUrl,
    };
  }

  listRepresentatives(exhibitorId: string) {
    return this.prisma.exhibitorRepresentative.findMany({
      where: { exhibitorId },
      orderBy: { createdAt: 'asc' },
    });
  }

  createRepresentative(exhibitorId: string, dto: CreateExhibitorRepresentativeDto) {
    return this.prisma.exhibitorRepresentative.create({
      data: {
        exhibitorId,
        name: dto.name,
        title: dto.title,
        phone: dto.phone,
      },
    });
  }

  async updateRepresentative(
    exhibitorId: string,
    representativeId: string,
    dto: UpdateExhibitorRepresentativeDto,
  ) {
    const rep = await this.prisma.exhibitorRepresentative.findFirst({
      where: { id: representativeId, exhibitorId },
    });
    if (!rep) {
      throw new NotFoundException('Representative not found');
    }
    const data = Object.fromEntries(
      Object.entries(dto).filter(([, v]) => v !== undefined),
    ) as Prisma.ExhibitorRepresentativeUpdateInput;
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields to update');
    }
    return this.prisma.exhibitorRepresentative.update({
      where: { id: representativeId },
      data,
    });
  }

  async deleteRepresentative(exhibitorId: string, representativeId: string) {
    const rep = await this.prisma.exhibitorRepresentative.findFirst({
      where: { id: representativeId, exhibitorId },
    });
    if (!rep) {
      throw new NotFoundException('Representative not found');
    }
    await this.prisma.exhibitorRepresentative.delete({
      where: { id: representativeId },
    });
    return { deleted: true };
  }

  listProducts(exhibitorId: string) {
    return this.prisma.exhibitorProduct.findMany({
      where: { exhibitorId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  createProduct(exhibitorId: string, dto: CreateExhibitorProductDto) {
    return this.prisma.exhibitorProduct.create({
      data: {
        exhibitorId,
        name: dto.name,
        description: dto.description ?? '',
        imageUrl: dto.imageUrl,
        linkUrl: dto.linkUrl,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  /**
   * Create product from multipart form: optional **`productImage`** file is uploaded to Cloudinary;
   * if no file, optional **`imageUrl`** string is stored when provided.
   */
  async createProductMultipart(
    exhibitorId: string,
    dto: CreateExhibitorProductMultipartDto,
    file?: Express.Multer.File | undefined,
  ) {
    let imageUrl: string | undefined = dto.imageUrl;

    if (file?.buffer?.length) {
      if (file.mimetype !== 'image/jpeg' && file.mimetype !== 'image/png') {
        throw new BadRequestException(
          'productImage must be a JPEG or PNG image',
        );
      }
      if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
        throw new BadRequestException('productImage must be at most 5MB');
      }
      imageUrl = await this.cloudinary.uploadBuffer(
        file.buffer,
        `exhibitors/${exhibitorId}/products`,
        'product',
        file.mimetype,
      );
    }

    return this.prisma.exhibitorProduct.create({
      data: {
        exhibitorId,
        name: dto.name,
        description: dto.description ?? '',
        imageUrl,
        linkUrl: dto.linkUrl,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateProduct(
    exhibitorId: string,
    productId: string,
    dto: UpdateExhibitorProductDto,
  ) {
    const p = await this.prisma.exhibitorProduct.findFirst({
      where: { id: productId, exhibitorId },
    });
    if (!p) {
      throw new NotFoundException('Product not found');
    }
    const data = Object.fromEntries(
      Object.entries(dto).filter(([, v]) => v !== undefined),
    ) as Prisma.ExhibitorProductUpdateInput;
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields to update');
    }
    return this.prisma.exhibitorProduct.update({
      where: { id: productId },
      data,
    });
  }

  async deleteProduct(exhibitorId: string, productId: string) {
    const p = await this.prisma.exhibitorProduct.findFirst({
      where: { id: productId, exhibitorId },
    });
    if (!p) {
      throw new NotFoundException('Product not found');
    }
    await this.prisma.exhibitorProduct.delete({ where: { id: productId } });
    return { deleted: true };
  }

  async getBoothPortal(exhibitorId: string) {
    return this.getDashboard(exhibitorId);
  }

  async createPublicLead(slug: string, dto: CreatePublicExhibitorLeadDto) {
    const exhibitor = await this.prisma.exhibitor.findFirst({
      where: {
        slug,
        user: { registrationStatus: 'registered' },
      },
      select: { id: true },
    });
    if (!exhibitor) {
      throw new NotFoundException('Exhibitor not found');
    }
    if (!dto.name && !dto.email && !dto.phone && !dto.message) {
      throw new BadRequestException('Provide at least one of name, email, phone, or message');
    }
    await this.prisma.exhibitorLead.create({
      data: {
        exhibitorId: exhibitor.id,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        message: dto.message,
      },
    });
    return { success: true };
  }

  async trackPublicProfileView(slug: string) {
    const exhibitor = await this.prisma.exhibitor.findFirst({
      where: {
        slug,
        user: { registrationStatus: 'registered' },
      },
      select: { id: true },
    });
    if (!exhibitor) {
      throw new NotFoundException('Exhibitor not found');
    }
    await this.prisma.exhibitor.update({
      where: { id: exhibitor.id },
      data: { profileViews: { increment: 1 } },
    });
    return { success: true };
  }

  /**
   * Normalize exhibitor phone for wa.me (digits only, international format, no leading +).
   */
  private normalizeWaPhone(raw: string): string | null {
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 10) {
      return null;
    }
    return digits;
  }

  private buildWhatsappProductInquiryMessage(productName: string, companyName: string): string {
    return `Hello, I'm interested in learning more about "${productName}" (${companyName}).`;
  }

  /**
   * Increments product WhatsApp click counter and returns the wa.me URL using the exhibitor's
   * **primaryContactPhone** (registration / profile — no separate WhatsApp field).
   */
  async getWhatsappProductInquiryRedirectUrl(slug: string, productId: string): Promise<string> {
    const exhibitor = await this.prisma.exhibitor.findFirst({
      where: {
        slug,
        user: { registrationStatus: 'registered' },
      },
      select: { id: true, companyName: true, primaryContactPhone: true },
    });
    if (!exhibitor) {
      throw new NotFoundException('Exhibitor not found');
    }

    const product = await this.prisma.exhibitorProduct.findFirst({
      where: { id: productId, exhibitorId: exhibitor.id },
      select: { id: true, name: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const phone = this.normalizeWaPhone(exhibitor.primaryContactPhone);
    if (!phone) {
      throw new BadRequestException(
        'Primary contact phone is missing or invalid for WhatsApp; update it on your exhibitor profile',
      );
    }

    await this.prisma.exhibitorProduct.update({
      where: { id: productId },
      data: { whatsappClickCount: { increment: 1 } },
    });

    const text = this.buildWhatsappProductInquiryMessage(product.name, exhibitor.companyName);
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  }
}
