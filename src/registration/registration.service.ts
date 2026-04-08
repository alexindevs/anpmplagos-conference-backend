import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
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
    model: 'member' | 'attendee' | 'company',
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
            : await this.prisma.company.findUnique({
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

  async findMe(userId: string) {
    type UserWithRelations = {
      id: string;
      createdAt: Date;
      updatedAt: Date;
      email: string;
      password: string;
      regType: RegType;
      registrationStatus: RegistrationStatus;
      member: {
        id: string;
        fullName: string;
        phone: string;
        anpmpId: string;
        primarySpecialty: string;
        hospitalOrg: string;
        avatar: string;
      } | null;
      attendee: {
        id: string;
        fullName: string;
        phone: string;
      } | null;
      payments: Array<{
        reference: string;
        status: string;
        paidAt: Date | null;
      }>;
    };

    const user = (await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        member: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            anpmpId: true,
            primarySpecialty: true,
            hospitalOrg: true,
            avatar: true,
          },
        },
        attendee: {
          select: { id: true, fullName: true, phone: true },
        },
        payments: {
          where: { kind: 'registration' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { reference: true, status: true, paidAt: true },
        },
      },
    })) as UserWithRelations | null;

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const payment = user.payments[0];

    const response: Record<string, unknown> = {
      id: user.id,
      status: this.mapRegistrationStatus(user.registrationStatus),
      user: {
        id: user.id,
        email: user.email,
        regType: user.regType,
        registrationStatus: user.registrationStatus,
      },
    };

    if (user.member) {
      response.member = {
        fullName: user.member.fullName,
        phone: user.member.phone,
        anpmpId: user.member.anpmpId,
        primarySpecialty: user.member.primarySpecialty,
        hospitalOrg: user.member.hospitalOrg,
        avatar: user.member.avatar,
      };
    }

    if (user.attendee) {
      response.attendee = {
        fullName: user.attendee.fullName,
        phone: user.attendee.phone,
      };
    }

    if (payment) {
      response.payment = {
        reference: payment.reference,
        status: payment.status,
        paidAt: payment.paidAt,
      };
    }

    return response;
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
    } else if (dto.regType === 'company') {
      const companyDto = dto;
      const slug = await this.generateUniqueSlug(
        'company',
        companyDto.companyName!,
      );
      const company = await this.prisma.company.create({
        data: {
          userId: user.id,
          slug,
          companyName: companyDto.companyName!,
          tagline: companyDto.tagline ?? undefined,
          description: companyDto.description!,
          boothPreference: companyDto.boothPreference ?? undefined,
          website: companyDto.website ?? undefined,
          contactEmail: companyDto.contactEmail!,
          primaryContactName: companyDto.primaryContactName!,
          primaryContactPhone: companyDto.primaryContactPhone!,
          headerImage: imagePaths?.headerImage,
          logo: imagePaths?.logo,
          highestSponsorshipTier: 'silver',
        },
      });

      if (companyDto.representatives?.length) {
        await this.prisma.companyRepresentative.createMany({
          data: companyDto.representatives.map((r) => ({
            companyId: company.id,
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
    } else {
      const invalidType: string = dto.regType;
      throw new BadRequestException(`Invalid regType: ${invalidType}`);
    }

    const base = {
      id: user.id,
      status:
        dto.regType === 'company'
          ? 'registered'
          : this.mapRegistrationStatus(user.registrationStatus),
      createdAt: user.createdAt,
      message:
        dto.regType === 'company'
          ? 'Company registration successful.'
          : 'Registration saved. Complete payment to confirm.',
    };

    if (dto.regType === 'company') {
      const tokens = await this.auth.issueTokensForUserId(user.id);
      return {
        ...base,
        status: 'registered',
        message: 'Company registration successful.',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiresIn: tokens.expiresIn,
        user: tokens.user,
      };
    }

    return base;
  }
}
