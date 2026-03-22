import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { CreateRegistrationDto } from './dto';
import { RegType, RegistrationStatus } from '@prisma/client';
import { AuthService, type AuthUser } from '../auth/auth.service';
import { RegistrationFiles } from './registration-files.interface';
import { RegistrationStorageService } from './registration-storage.service';

@Injectable()
export class RegistrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: RegistrationStorageService,
    private readonly auth: AuthService,
  ) {}

  private mapRegistrationStatus(status: RegistrationStatus): string {
    switch (status) {
      case 'pending_payment':
        return 'pending-payment';
      case 'registered':
        return 'registered';
      case 'cancelled':
        return 'cancelled';
      default:
        return String(status);
    }
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  private async generateUniqueSlug(
    model: 'member' | 'attendee' | 'exhibitor' | 'sponsor',
    source: string,
  ): Promise<string> {
    const normalized = this.slugify(source);
    const base = normalized.length ? normalized : `${model}-${Date.now()}`;
    let candidate = base;
    let suffix = 1;

    while (true) {
      const existing =
        model === 'member'
          ? await this.prisma.member.findUnique({
              where: { slug: candidate },
              select: { id: true },
            })
          : model === 'attendee'
            ? await this.prisma.attendee.findUnique({
                where: { slug: candidate },
                select: { id: true },
              })
            : model === 'exhibitor'
              ? await this.prisma.exhibitor.findUnique({
                  where: { slug: candidate },
                  select: { id: true },
                })
              : await this.prisma.sponsor.findUnique({
                  where: { slug: candidate },
                  select: { id: true },
                });

      if (!existing) {
        return candidate;
      }

      suffix += 1;
      candidate = `${base}-${suffix}`;
    }
  }

  async findMemberBySlug(slug: string) {
    return this.prisma.member.findUnique({
      where: { slug },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            registrationStatus: true,
          },
        },
      },
    });
  }

  async findAttendeeBySlug(slug: string) {
    return this.prisma.attendee.findUnique({
      where: { slug },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            registrationStatus: true,
          },
        },
      },
    });
  }

  async create(
    dto: CreateRegistrationDto,
    files?: RegistrationFiles,
  ): Promise<{
    id: string;
    status: string;
    createdAt: Date;
    message: string;
    access_token?: string;
    refresh_token?: string;
    expiresIn?: string;
    user?: AuthUser;
  }> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        regType: dto.regType as RegType,
        registrationStatus: 'pending_payment',
      },
    });

    const imagePaths = files
      ? await this.storage.saveRegistrationImages(user.id, files)
      : undefined;

    if (dto.regType === 'member') {
      const memberDto = dto;
      const slug = await this.generateUniqueSlug('member', memberDto.fullName!);
      await this.prisma.member.create({
        data: {
          userId: user.id,
          slug,
          fullName: memberDto.fullName!,
          phone: memberDto.phone!,
          bio: memberDto.bio ?? undefined,
          anpmpId: memberDto.anpmpId!,
          hasSpouse: memberDto.hasSpouse!,
          spouseName: memberDto.spouseName ?? undefined,
          spouseEmail: memberDto.spouseEmail ?? undefined,
          spousePhone: memberDto.spousePhone ?? undefined,
          primarySpecialty: memberDto.primarySpecialty!,
          hospitalOrg: memberDto.hospitalOrg!,
          avatar: imagePaths?.avatar,
        },
      });
    } else if (dto.regType === 'attendee') {
      const attendeeDto = dto;
      const slug = await this.generateUniqueSlug(
        'attendee',
        attendeeDto.fullName!,
      );
      await this.prisma.attendee.create({
        data: {
          userId: user.id,
          slug,
          fullName: attendeeDto.fullName!,
          phone: attendeeDto.phone!,
          bio: attendeeDto.bio ?? undefined,
          inMedicalField: attendeeDto.inMedicalField!,
          primarySpecialty: attendeeDto.primarySpecialty ?? undefined,
          hospitalOrg: attendeeDto.hospitalOrg ?? undefined,
          occupation: attendeeDto.occupation ?? undefined,
          avatar: imagePaths?.avatar,
        },
      });
    } else if (dto.regType === 'exhibitor') {
      const exhibitorDto = dto;
      const slug = await this.generateUniqueSlug(
        'exhibitor',
        exhibitorDto.companyName!,
      );
      const exhibitor = await this.prisma.exhibitor.create({
        data: {
          userId: user.id,
          slug,
          companyName: exhibitorDto.companyName!,
          tagline: exhibitorDto.tagline ?? undefined,
          description: exhibitorDto.description!,
          boothPreference: exhibitorDto.boothPreference ?? undefined,
          website: exhibitorDto.website ?? undefined,
          contactEmail: exhibitorDto.contactEmail!,
          primaryContactName: exhibitorDto.primaryContactName!,
          primaryContactPhone: exhibitorDto.primaryContactPhone!,
          headerImage: imagePaths?.headerImage,
          profileImage: imagePaths?.profileImage,
        },
      });

      if (exhibitorDto.representatives?.length) {
        await this.prisma.exhibitorRepresentative.createMany({
          data: exhibitorDto.representatives.map((r) => ({
            exhibitorId: exhibitor.id,
            name: r.name,
            title: r.title,
            phone: r.phone,
          })),
        });
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: { registrationStatus: 'registered' },
      });
    } else if (dto.regType === 'sponsor') {
      const sponsorDto = dto;
      const slug = await this.generateUniqueSlug(
        'sponsor',
        sponsorDto.companyName!,
      );

      // Validate sponsor amount if provided
      if (
        sponsorDto.sponsorAmount !== undefined &&
        sponsorDto.sponsorAmount < 150000000
      ) {
        throw new BadRequestException(
          'Sponsor amount must be at least ₦1,500,000 (150,000,000 kobo)',
        );
      }

      // Update user registration status to 'registered' (no payment required at signup)
      await this.prisma.user.update({
        where: { id: user.id },
        data: { registrationStatus: 'registered' },
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await this.prisma.sponsor.create({
        data: {
          userId: user.id,
          slug,
          companyName: sponsorDto.companyName!,
          tagline: sponsorDto.tagline ?? undefined,
          description: sponsorDto.description!,
          website: sponsorDto.website ?? undefined,
          contactEmail: sponsorDto.contactEmail!,
          primaryContactName: sponsorDto.primaryContactName!,
          primaryContactPhone: sponsorDto.primaryContactPhone!,
          sponsorAmount: sponsorDto.sponsorAmount ?? undefined,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          logo: imagePaths?.logo,
          headerImage: imagePaths?.headerImage,
        },
      });
    } else {
      const invalidType: string = dto.regType;
      throw new BadRequestException(`Invalid regType: ${invalidType}`);
    }

    const base = {
      id: user.id,
      status:
        dto.regType === 'sponsor'
          ? 'registered'
          : this.mapRegistrationStatus(user.registrationStatus),
      createdAt: user.createdAt,
      message:
        dto.regType === 'sponsor'
          ? 'Sponsor registration successful.'
          : 'Registration saved. Complete payment to confirm.',
    };

    if (dto.regType === 'exhibitor') {
      const tokens = await this.auth.issueTokensForUserId(user.id);
      return {
        ...base,
        status: 'registered',
        message: 'Exhibitor registration successful.',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiresIn: tokens.expiresIn,
        user: tokens.user,
      };
    }

    return base;
  }
}
