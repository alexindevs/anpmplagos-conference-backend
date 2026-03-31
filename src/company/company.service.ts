import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, SponsorTier } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BoothService } from '../booth/booth.service';
import { AdvertSlotService } from '../marketing-slots/advert-slot.service';
import { BrandingSlotService } from '../marketing-slots/branding-slot.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateCompanyProductDto } from './dto/create-company-product.dto';
import type { Express } from 'express';
import { CreateCompanyProductMultipartDto } from './dto/create-company-product-multipart.dto';
import { CreateCompanyRepresentativeDto } from './dto/create-company-representative.dto';
import { CreatePublicCompanyLeadDto } from './dto/create-public-company-lead.dto';
import { UpdateCompanyProductDto } from './dto/update-company-product.dto';
import { UpdateCompanyProfileDto } from './dto/update-company-profile.dto';
import { UpdateCompanyRepresentativeDto } from './dto/update-company-representative.dto';
import { UpdateAdminCompanyDto } from './dto/update-admin-company.dto';
import { effectiveDisplayTier } from './company-tier.util';

const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

@Injectable()
export class CompanyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boothService: BoothService,
    private readonly cloudinary: CloudinaryService,
    private readonly advertSlotService: AdvertSlotService,
    private readonly brandingSlotService: BrandingSlotService,
  ) {}

  async findById(id: string) {
    return this.prisma.company.findUnique({
      where: { id },
      include: {
        representatives: true,
        booth: true,
      },
    });
  }

  async findByUserId(userId: string) {
    return this.prisma.company.findUnique({
      where: { userId },
      include: {
        representatives: true,
        booth: true,
      },
    });
  }

  async selectBooth(companyId: string, boothId: string) {
    const company = await this.findById(companyId);
    if (!company) {
      throw new NotFoundException(`Company ${companyId} not found`);
    }
    return this.boothService.assignToCompany(boothId, companyId);
  }

  async releaseBooth(companyId: string) {
    const company = await this.findById(companyId);
    if (!company) {
      throw new NotFoundException(`Company ${companyId} not found`);
    }
    const booth = company.booth;
    if (!booth) {
      throw new NotFoundException('Company has no booth assigned');
    }
    return this.boothService.release(booth.id);
  }

  /**
   * Assign or unassign a booth (admin). Uses only `Booth.takenById` → Company.
   */
  async assignBoothAdmin(companyId: string, boothId: string | null) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException(`Company with ID ${companyId} not found`);
    }

    const currentBooth = await this.prisma.booth.findFirst({
      where: { takenById: companyId },
    });

    if (boothId === null) {
      if (currentBooth) {
        await this.boothService.release(currentBooth.id);
      }
      return this.findOneAdmin(companyId);
    }

    const booth = await this.prisma.booth.findUnique({
      where: { id: boothId },
    });
    if (!booth) {
      throw new NotFoundException(`Booth with ID ${boothId} not found`);
    }
    if (booth.isTaken && booth.takenById !== companyId) {
      throw new BadRequestException('Booth is already taken');
    }
    if (booth.isReserved) {
      throw new BadRequestException('Booth is reserved and cannot be assigned');
    }

    if (currentBooth && currentBooth.id !== boothId) {
      await this.boothService.release(currentBooth.id);
    }

    if (!booth.isTaken || booth.takenById !== companyId) {
      await this.prisma.booth.update({
        where: { id: boothId },
        data: { isTaken: true, takenById: companyId },
      });
    }

    await this.boothService.applyBoothTierToCompany(companyId, booth.tier);

    return this.findOneAdmin(companyId);
  }

  async assignAdvertSlotAdmin(companyId: string, advertSlotId: string) {
    return this.advertSlotService.assignAdmin(companyId, advertSlotId);
  }

  async unassignAdvertSlotAdmin(companyId: string, advertSlotId: string) {
    return this.advertSlotService.unassignAdmin(companyId, advertSlotId);
  }

  async assignBrandingSlotAdmin(companyId: string, brandingSlotId: string) {
    return this.brandingSlotService.assignAdmin(companyId, brandingSlotId);
  }

  async unassignBrandingSlotAdmin(companyId: string, brandingSlotId: string) {
    return this.brandingSlotService.unassignAdmin(companyId, brandingSlotId);
  }

  async findAllAdmin(params?: {
    page?: number;
    pageSize?: number;
    tier?: string;
    search?: string;
  }) {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.CompanyWhereInput = {};
    const and: Prisma.CompanyWhereInput[] = [];
    if (params?.search) {
      and.push({
        OR: [
          { companyName: { contains: params.search, mode: 'insensitive' } },
          { contactEmail: { contains: params.search, mode: 'insensitive' } },
        ],
      });
    }
    if (params?.tier) {
      and.push({
        OR: [
          { booth: { tier: params.tier as SponsorTier } },
          { highestSponsorshipTier: params.tier as SponsorTier },
        ],
      });
    }
    if (and.length) {
      where.AND = and;
    }

    const [items, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          booth: { select: { id: true, name: true, size: true, tier: true } },
          masterclasses: { select: { id: true, title: true } },
          panels: { select: { id: true, title: true } },
          presentations: { select: { id: true, title: true } },
          user: { select: { email: true, registrationStatus: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.company.count({ where }),
    ]);

    return {
      items: items.map((c) => ({
        ...c,
        effectiveDisplayTier: effectiveDisplayTier(c),
      })),
      page,
      pageSize,
      total,
    };
  }

  async findOneAdmin(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            email: true,
            registrationStatus: true,
          },
        },
        booth: true,
        masterclasses: true,
        panels: true,
        presentations: true,
        representatives: true,
      },
    });
    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }
    return {
      ...company,
      effectiveDisplayTier: effectiveDisplayTier(company),
    };
  }

  async updateAdmin(id: string, dto: UpdateAdminCompanyDto) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }

    const data: Prisma.CompanyUpdateInput = {};
    const keys = [
      'companyName',
      'tagline',
      'description',
      'boothPreference',
      'website',
      'contactEmail',
      'primaryContactName',
      'primaryContactPhone',
      'highestSponsorshipTier',
      'sponsorshipPaidTotalKobo',
      'logo',
      'headerImage',
    ] as const;
    for (const k of keys) {
      if (dto[k] !== undefined) {
        (data as Record<string, unknown>)[k] = dto[k];
      }
    }

    return this.prisma.company.update({
      where: { id },
      data,
      include: {
        booth: {
          select: {
            id: true,
            name: true,
            size: true,
            tier: true,
          },
        },
      },
    });
  }

  async listActiveSponsorshipPlans() {
    return this.prisma.sponsorshipPlan.findMany({
      where: { isActive: true },
      orderBy: { priceInKobo: 'asc' },
    });
  }

  async createSponsorshipPlan(dto: {
    name: string;
    priceInKobo: number;
    tier: SponsorTier;
    perks?: string[];
    isActive?: boolean;
  }) {
    return this.prisma.sponsorshipPlan.create({
      data: {
        name: dto.name,
        priceInKobo: dto.priceInKobo,
        tier: dto.tier,
        perks: dto.perks ?? [],
        isActive: dto.isActive ?? true,
      },
    });
  }

  async listAllSponsorshipPlans(filters?: {
    tier?: SponsorTier;
    isActive?: boolean;
  }) {
    const where: Prisma.SponsorshipPlanWhereInput = {};
    if (filters?.tier) {
      where.tier = filters.tier;
    }
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return this.prisma.sponsorshipPlan.findMany({
      where,
      orderBy: { priceInKobo: 'asc' },
    });
  }

  async findSponsorshipPlanById(id: string) {
    return this.prisma.sponsorshipPlan.findUnique({
      where: { id },
    });
  }

  async updateSponsorshipPlan(
    id: string,
    dto: {
      name?: string;
      priceInKobo?: number;
      tier?: SponsorTier;
      perks?: string[];
      isActive?: boolean;
    },
  ) {
    const plan = await this.prisma.sponsorshipPlan.findUnique({
      where: { id },
    });
    if (!plan) {
      throw new NotFoundException(`Sponsorship plan ${id} not found`);
    }

    return this.prisma.sponsorshipPlan.update({
      where: { id },
      data: {
        name: dto.name,
        priceInKobo: dto.priceInKobo,
        tier: dto.tier,
        perks: dto.perks,
        isActive: dto.isActive,
      },
    });
  }

  async deleteSponsorshipPlan(id: string) {
    const plan = await this.prisma.sponsorshipPlan.findUnique({
      where: { id },
      include: { payments: { take: 1 } },
    });
    if (!plan) {
      throw new NotFoundException(`Sponsorship plan ${id} not found`);
    }
    if (plan.payments.length > 0) {
      throw new BadRequestException(
        'Cannot delete plan with existing payments. Deactivate it instead.',
      );
    }

    await this.prisma.sponsorshipPlan.delete({
      where: { id },
    });

    return { deleted: true };
  }

  async findPublic(filters?: { tier?: SponsorTier }) {
    const rows = await this.prisma.company.findMany({
      where: {
        user: {
          registrationStatus: 'registered',
        },
        OR: [
          { booth: { is: { id: { not: undefined } } } },
          { sponsorshipPaidTotalKobo: { gt: 0 } },
        ],
      },
      select: {
        id: true,
        slug: true,
        companyName: true,
        tagline: true,
        description: true,
        website: true,
        headerImage: true,
        logo: true,
        highestSponsorshipTier: true,
        sponsorshipPaidTotalKobo: true,
        booth: {
          select: {
            id: true,
            name: true,
            size: true,
            tier: true,
          },
        },
      },
      orderBy: { companyName: 'asc' },
    });

    const mapped = rows.map((c) => ({
      ...c,
      effectiveDisplayTier: effectiveDisplayTier(c),
    }));

    if (filters?.tier) {
      return mapped.filter((c) => c.effectiveDisplayTier === filters.tier);
    }
    return mapped;
  }

  async findPublicBySlug(slug: string) {
    const company = await this.prisma.company.findFirst({
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
            tier: true,
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
        masterclasses: {
          where: { status: 'published' },
          select: {
            id: true,
            title: true,
            description: true,
            priceInKobo: true,
            status: true,
          },
        },
        panels: {
          where: { status: 'published' },
          select: {
            id: true,
            title: true,
            description: true,
            priceInKobo: true,
            status: true,
          },
        },
        presentations: {
          where: { status: 'published' },
          select: {
            id: true,
            title: true,
            description: true,
            priceInKobo: true,
            status: true,
          },
        },
      },
    });

    if (!company) return null;

    const eff = effectiveDisplayTier(company);

    return {
      id: company.id,
      slug: company.slug,
      companyName: company.companyName,
      tagline: company.tagline,
      description: company.description,
      boothPreference: company.boothPreference,
      website: company.website,
      contactEmail: company.contactEmail,
      primaryContactName: company.primaryContactName,
      primaryContactPhone: company.primaryContactPhone,
      effectiveDisplayTier: eff,
      sponsorshipPaidTotalKobo: company.sponsorshipPaidTotalKobo,
      highestSponsorshipTier: company.highestSponsorshipTier,
      logo: company.logo,
      headerImage: company.headerImage,
      booth: company.booth,
      representatives: company.representatives,
      products: company.products,
      masterclasses: company.masterclasses,
      panelSessions: company.panels,
      presentations: company.presentations,
    };
  }

  requireCompanyAccount(
    regType: string,
    company?: { id: string } | null,
  ): string {
    if (regType !== 'company' || !company?.id) {
      throw new ForbiddenException('Company account required');
    }
    return company.id;
  }

  async getPortalProfile(companyId: string) {
    const row = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        representatives: { orderBy: { createdAt: 'asc' } },
        booth: true,
        products: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] },
      },
    });
    if (!row) {
      throw new NotFoundException('Company not found');
    }
    return {
      ...row,
      effectiveDisplayTier: effectiveDisplayTier(row),
    };
  }

  async updatePortalProfile(companyId: string, dto: UpdateCompanyProfileDto) {
    const data: Prisma.CompanyUpdateInput = {};
    const keys = [
      'companyName',
      'tagline',
      'description',
      'boothPreference',
      'website',
      'contactEmail',
      'primaryContactName',
      'primaryContactPhone',
      'headerImage',
      'logo',
    ] as const;
    for (const k of keys) {
      if (dto[k] !== undefined) {
        (data as Record<string, unknown>)[k] = dto[k];
      }
    }
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields to update');
    }
    const row = await this.prisma.company.update({
      where: { id: companyId },
      data,
      include: {
        representatives: true,
        booth: true,
        products: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] },
      },
    });
    return {
      ...row,
      effectiveDisplayTier: effectiveDisplayTier(row),
    };
  }

  async getDashboard(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: { booth: true },
    });
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const [totalMembers, pendingBoothPayment, whatsappClicksSum] =
      await Promise.all([
        this.prisma.user.count({ where: { regType: 'member' } }),
        this.prisma.payment.findFirst({
          where: {
            companyId,
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
        this.prisma.companyProduct.aggregate({
          where: { companyId },
          _sum: { whatsappClickCount: true },
        }),
      ]);

    const views = company.profileViews;
    const inquiryRatePercent =
      views > 0 ? Math.round((totalMembers / views) * 10000) / 100 : 0;

    let boothStatus: 'none' | 'pending_payment' | 'assigned';
    if (company.booth) {
      boothStatus = 'assigned';
    } else if (pendingBoothPayment) {
      boothStatus = 'pending_payment';
    } else {
      boothStatus = 'none';
    }

    return {
      companyName: company.companyName,
      slug: company.slug,
      effectiveDisplayTier: effectiveDisplayTier(company),
      stats: {
        profileViews: views,
        totalMembers,
        inquiryRatePercent,
        whatsappProductClicks: whatsappClicksSum._sum.whatsappClickCount ?? 0,
      },
      booth: {
        status: boothStatus,
        assignedBooth: company.booth,
        pendingPayment: pendingBoothPayment,
      },
      sponsorshipPaidTotalKobo: company.sponsorshipPaidTotalKobo,
      highestSponsorshipTier: company.highestSponsorshipTier,
    };
  }

  listRepresentatives(companyId: string) {
    return this.prisma.companyRepresentative.findMany({
      where: { companyId },
      orderBy: { createdAt: 'asc' },
    });
  }

  createRepresentative(companyId: string, dto: CreateCompanyRepresentativeDto) {
    return this.prisma.companyRepresentative.create({
      data: {
        companyId,
        name: dto.name,
        title: dto.title,
        phone: dto.phone,
      },
    });
  }

  async updateRepresentative(
    companyId: string,
    representativeId: string,
    dto: UpdateCompanyRepresentativeDto,
  ) {
    const rep = await this.prisma.companyRepresentative.findFirst({
      where: { id: representativeId, companyId },
    });
    if (!rep) {
      throw new NotFoundException('Representative not found');
    }
    const data = Object.fromEntries(
      Object.entries(dto).filter(([, v]) => v !== undefined),
    ) as Prisma.CompanyRepresentativeUpdateInput;
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields to update');
    }
    return this.prisma.companyRepresentative.update({
      where: { id: representativeId },
      data,
    });
  }

  async deleteRepresentative(companyId: string, representativeId: string) {
    const rep = await this.prisma.companyRepresentative.findFirst({
      where: { id: representativeId, companyId },
    });
    if (!rep) {
      throw new NotFoundException('Representative not found');
    }
    await this.prisma.companyRepresentative.delete({
      where: { id: representativeId },
    });
    return { deleted: true };
  }

  listProducts(companyId: string) {
    return this.prisma.companyProduct.findMany({
      where: { companyId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  createProduct(companyId: string, dto: CreateCompanyProductDto) {
    return this.prisma.companyProduct.create({
      data: {
        companyId,
        name: dto.name,
        description: dto.description ?? '',
        imageUrl: dto.imageUrl,
        linkUrl: dto.linkUrl,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async createProductMultipart(
    companyId: string,
    dto: CreateCompanyProductMultipartDto,
    file?: Express.Multer.File,
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
        `companies/${companyId}/products`,
        'product',
        file.mimetype,
      );
    }

    return this.prisma.companyProduct.create({
      data: {
        companyId,
        name: dto.name,
        description: dto.description ?? '',
        imageUrl,
        linkUrl: dto.linkUrl,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateProduct(
    companyId: string,
    productId: string,
    dto: UpdateCompanyProductDto,
  ) {
    const p = await this.prisma.companyProduct.findFirst({
      where: { id: productId, companyId },
    });
    if (!p) {
      throw new NotFoundException('Product not found');
    }
    const data = Object.fromEntries(
      Object.entries(dto).filter(([, v]) => v !== undefined),
    ) as Prisma.CompanyProductUpdateInput;
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields to update');
    }
    return this.prisma.companyProduct.update({
      where: { id: productId },
      data,
    });
  }

  async deleteProduct(companyId: string, productId: string) {
    const p = await this.prisma.companyProduct.findFirst({
      where: { id: productId, companyId },
    });
    if (!p) {
      throw new NotFoundException('Product not found');
    }
    await this.prisma.companyProduct.delete({ where: { id: productId } });
    return { deleted: true };
  }

  async getBoothPortal(companyId: string) {
    return this.getDashboard(companyId);
  }

  async createPublicLead(slug: string, dto: CreatePublicCompanyLeadDto) {
    const company = await this.prisma.company.findFirst({
      where: {
        slug,
        user: { registrationStatus: 'registered' },
      },
      select: { id: true },
    });
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    if (!dto.name && !dto.email && !dto.phone && !dto.message) {
      throw new BadRequestException(
        'Provide at least one of name, email, phone, or message',
      );
    }
    await this.prisma.companyLead.create({
      data: {
        companyId: company.id,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        message: dto.message,
      },
    });
    return { success: true };
  }

  async trackPublicProfileView(slug: string) {
    const company = await this.prisma.company.findFirst({
      where: {
        slug,
        user: { registrationStatus: 'registered' },
      },
      select: { id: true },
    });
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    await this.prisma.company.update({
      where: { id: company.id },
      data: { profileViews: { increment: 1 } },
    });
    return { success: true };
  }

  private normalizeWaPhone(raw: string): string | null {
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 10) {
      return null;
    }
    return digits;
  }

  private buildWhatsappProductInquiryMessage(
    productName: string,
    companyName: string,
  ): string {
    return `Hello, I'm interested in learning more about "${productName}" (${companyName}).`;
  }

  async getWhatsappProductInquiryRedirectUrl(
    slug: string,
    productId: string,
  ): Promise<string> {
    const company = await this.prisma.company.findFirst({
      where: {
        slug,
        user: { registrationStatus: 'registered' },
      },
      select: { id: true, companyName: true, primaryContactPhone: true },
    });
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const product = await this.prisma.companyProduct.findFirst({
      where: { id: productId, companyId: company.id },
      select: { id: true, name: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const phone = this.normalizeWaPhone(company.primaryContactPhone);
    if (!phone) {
      throw new BadRequestException(
        'Primary contact phone is missing or invalid for WhatsApp; update it on your company profile',
      );
    }

    await this.prisma.companyProduct.update({
      where: { id: productId },
      data: { whatsappClickCount: { increment: 1 } },
    });

    const text = this.buildWhatsappProductInquiryMessage(
      product.name,
      company.companyName,
    );
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  }

  /**
   * Published slots that are not reserved and not yet sold — for company storefront / checkout UI.
   */
  async listAvailableSessionSlots() {
    const whereAvailable = {
      status: 'published' as const,
      isTaken: false,
      isReserved: false,
    };
    const selectCatalog = {
      id: true,
      title: true,
      description: true,
      priceInKobo: true,
      createdAt: true,
    } as const;

    const [masterclasses, panelSessions, presentations] = await Promise.all([
      this.prisma.masterclass.findMany({
        where: whereAvailable,
        orderBy: { createdAt: 'desc' },
        select: selectCatalog,
      }),
      this.prisma.panelSession.findMany({
        where: whereAvailable,
        orderBy: { createdAt: 'desc' },
        select: selectCatalog,
      }),
      this.prisma.presentation.findMany({
        where: whereAvailable,
        orderBy: { createdAt: 'desc' },
        select: selectCatalog,
      }),
    ]);

    return { masterclasses, panelSessions, presentations };
  }

  /**
   * Slots assigned to this company plus any in-progress session checkouts.
   */
  async listCompanySessionSlots(companyId: string) {
    const selectOwned = {
      id: true,
      title: true,
      description: true,
      priceInKobo: true,
      status: true,
      isTaken: true,
      isReserved: true,
      createdAt: true,
      updatedAt: true,
    } as const;

    const [masterclasses, panelSessions, presentations, pendingRaw] =
      await Promise.all([
        this.prisma.masterclass.findMany({
          where: { takenById: companyId },
          orderBy: { updatedAt: 'desc' },
          select: selectOwned,
        }),
        this.prisma.panelSession.findMany({
          where: { takenById: companyId },
          orderBy: { updatedAt: 'desc' },
          select: selectOwned,
        }),
        this.prisma.presentation.findMany({
          where: { takenById: companyId },
          orderBy: { updatedAt: 'desc' },
          select: selectOwned,
        }),
        this.prisma.payment.findMany({
          where: {
            companyId,
            status: 'pending',
            kind: { in: ['masterclass', 'panel', 'presentation'] },
          },
          select: {
            reference: true,
            kind: true,
            amount: true,
            baseAmount: true,
            masterclassId: true,
            panelSessionId: true,
            presentationId: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

    const pendingSessionPayments = pendingRaw
      .map((p) => {
        const sessionId =
          p.kind === 'masterclass'
            ? p.masterclassId
            : p.kind === 'panel'
              ? p.panelSessionId
              : p.presentationId;
        if (!sessionId) {
          return null;
        }
        return {
          reference: p.reference,
          kind: p.kind,
          amount: p.amount,
          baseAmount: p.baseAmount,
          createdAt: p.createdAt,
          sessionId,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    return {
      masterclasses,
      panelSessions,
      presentations,
      pendingSessionPayments,
    };
  }
}
