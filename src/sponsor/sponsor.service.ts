import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import type { SponsorTier } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSponsorDto } from './dto/update-sponsor.dto';

@Injectable()
export class SponsorService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    tier?: string;
    search?: string;
  }) {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (params?.status) where.status = params.status;
    if (params?.tier) where.tier = params.tier;
    if (params?.search) {
      where.OR = [
        { companyName: { contains: params.search, mode: 'insensitive' } },
        { contactEmail: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.sponsor.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          booth: {
            select: {
              id: true,
              name: true,
              size: true,
            },
          },
          masterclasses: {
            select: {
              id: true,
              title: true,
            },
          },
          panels: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sponsor.count({ where }),
    ]);

    return {
      items,
      page,
      pageSize,
      total,
    };
  }

  async findOne(id: string) {
    const sponsor = await this.prisma.sponsor.findUnique({
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
      },
    });
    if (!sponsor) {
      throw new NotFoundException(`Sponsor with ID ${id} not found`);
    }
    return sponsor;
  }

  async update(id: string, dto: UpdateSponsorDto) {
    const sponsor = await this.prisma.sponsor.findUnique({
      where: { id },
    });
    if (!sponsor) {
      throw new NotFoundException(`Sponsor with ID ${id} not found`);
    }

    if (dto.sponsorAmount !== undefined && dto.sponsorAmount < 150000000) {
      throw new BadRequestException('Sponsor amount must be at least ₦1,500,000 (150,000,000 kobo)');
    }

    return this.prisma.sponsor.update({
      where: { id },
      data: dto,
      include: {
        booth: {
          select: {
            id: true,
            name: true,
            size: true,
          },
        },
      },
    });
  }

  async assignBooth(sponsorId: string, boothId: string | null) {
    const sponsor = await this.prisma.sponsor.findUnique({
      where: { id: sponsorId },
      include: { booth: true },
    });
    if (!sponsor) {
      throw new NotFoundException(`Sponsor with ID ${sponsorId} not found`);
    }

    // If unsassigning booth
    if (boothId === null) {
      if (sponsor.boothId) {
        await this.prisma.booth.update({
          where: { id: sponsor.boothId },
          data: { sponsorTakenById: null, isTaken: false },
        });
      }
      return this.prisma.sponsor.update({
        where: { id: sponsorId },
        data: { boothId: null },
        include: { booth: true },
      });
    }

    // Assigning a booth
    const booth = await this.prisma.booth.findUnique({
      where: { id: boothId },
    });
    if (!booth) {
      throw new NotFoundException(`Booth with ID ${boothId} not found`);
    }
    if (booth.isTaken && booth.sponsorTakenById !== sponsorId) {
      throw new BadRequestException('Booth is already taken');
    }
    if (booth.isReserved) {
      throw new BadRequestException('Booth is reserved and cannot be assigned');
    }

    // Release old booth if exists
    if (sponsor.boothId && sponsor.boothId !== boothId) {
      await this.prisma.booth.update({
        where: { id: sponsor.boothId },
        data: { sponsorTakenById: null, isTaken: false },
      });
    }

    // Assign new booth
    await this.prisma.booth.update({
      where: { id: boothId },
      data: { sponsorTakenById: sponsorId, isTaken: true },
    });

    return this.prisma.sponsor.update({
      where: { id: sponsorId },
      data: { boothId },
      include: { booth: true },
    });
  }

  async findPublic(filters?: { tier?: SponsorTier }) {
    return this.prisma.sponsor.findMany({
      where: {
        status: 'active',
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
        website: true,
        tier: true,
        logo: true,
        headerImage: true,
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
    const sponsor = await this.prisma.sponsor.findFirst({
      where: {
        slug,
        status: 'active',
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
        masterclasses: {
          where: { status: 'published' },
          select: {
            id: true,
            title: true,
            description: true,
            startTime: true,
            endTime: true,
            location: true,
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
            startTime: true,
            endTime: true,
            location: true,
            priceInKobo: true,
            status: true,
          },
        },
      },
    });

    if (!sponsor) return null;

    return {
      id: sponsor.id,
      slug: sponsor.slug,
      companyName: sponsor.companyName,
      description: sponsor.description,
      tagline: sponsor.tagline,
      website: sponsor.website,
      contactEmail: sponsor.contactEmail,
      primaryContactName: sponsor.primaryContactName,
      primaryContactPhone: sponsor.primaryContactPhone,
      tier: sponsor.tier,
      sponsorAmount: sponsor.sponsorAmount,
      status: sponsor.status,
      logo: sponsor.logo,
      headerImage: sponsor.headerImage,
      booth: sponsor.booth,
      masterclasses: sponsor.masterclasses,
      panelSessions: sponsor.panels,
    };
  }
}
