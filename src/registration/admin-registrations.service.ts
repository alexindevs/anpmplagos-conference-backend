import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RegType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { buildPublicProfileUrl } from '../common/profile-url.util';

export type AdminRegistrationSummary = {
  members: number;
  attendees: number;
  companies: number;
  speakers: number;
  specialGuests: number;
  /** All non-admin user accounts (member, attendee, company, and any future registrant types). */
  totalRegistrations: number;
};

export type AdminRegistrationListItem = {
  userId: string;
  name: string;
  email: string;
  profileImage: string | null;
  type: RegType;
  registeredAt: string;
  status: string;
  /** Public directory URL when a slug exists; `null` if related profile row is missing. */
  profileUrl: string | null;
};

type UserListRow = {
  id: string;
  email: string;
  regType: RegType;
  registrationStatus: string;
  createdAt: Date;
  member: {
    fullName: string;
    avatar: string | null;
    slug: string;
  } | null;
  attendee: {
    fullName: string;
    avatar: string | null;
    slug: string;
  } | null;
  company: {
    companyName: string;
    logo: string | null;
    slug: string;
  } | null;
};

@Injectable()
export class AdminRegistrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getSummary(): Promise<AdminRegistrationSummary> {
    const [
      members,
      attendees,
      companies,
      speakers,
      specialGuests,
      totalRegistrations,
    ] = await Promise.all([
      this.prisma.member.count(),
      this.prisma.attendee.count(),
      this.prisma.company.count(),
      this.prisma.conferenceProfile.count({ where: { kind: 'speaker' } }),
      this.prisma.conferenceProfile.count({
        where: { kind: 'special_guest' },
      }),
      this.prisma.user.count({ where: { regType: { not: 'admin' } } }),
    ]);

    return {
      members,
      attendees,
      companies,
      speakers,
      specialGuests,
      totalRegistrations,
    };
  }

  private mapUserToListItem(
    user: UserListRow,
    frontendUrl: string,
  ): AdminRegistrationListItem {
    const base = {
      userId: user.id,
      email: user.email,
      type: user.regType,
      registeredAt: user.createdAt.toISOString(),
      status: user.registrationStatus,
    };

    switch (user.regType) {
      case 'member':
        if (!user.member) {
          return {
            ...base,
            name: user.email,
            profileImage: null,
            profileUrl: null,
          };
        }
        return {
          ...base,
          name: user.member.fullName,
          profileImage: user.member.avatar,
          profileUrl: buildPublicProfileUrl(
            frontendUrl,
            'member',
            user.member.slug,
          ),
        };
      case 'attendee':
        if (!user.attendee) {
          return {
            ...base,
            name: user.email,
            profileImage: null,
            profileUrl: null,
          };
        }
        return {
          ...base,
          name: user.attendee.fullName,
          profileImage: user.attendee.avatar,
          profileUrl: buildPublicProfileUrl(
            frontendUrl,
            'attendee',
            user.attendee.slug,
          ),
        };
      case 'company':
        if (!user.company) {
          return {
            ...base,
            name: user.email,
            profileImage: null,
            profileUrl: null,
          };
        }
        return {
          ...base,
          name: user.company.companyName,
          profileImage: user.company.logo,
          profileUrl: buildPublicProfileUrl(
            frontendUrl,
            'company',
            user.company.slug,
          ),
        };
      default:
        return {
          ...base,
          name: user.email,
          profileImage: null,
          profileUrl: null,
        };
    }
  }

  async listNonAdminRegistrationsPaginated(
    page: number,
    limit: number,
  ): Promise<{
    items: AdminRegistrationListItem[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { regType: { not: 'admin' } },
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
        include: {
          member: {
            select: { fullName: true, avatar: true, slug: true },
          },
          attendee: {
            select: { fullName: true, avatar: true, slug: true },
          },
          company: {
            select: {
              companyName: true,
              logo: true,
              slug: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where: { regType: { not: 'admin' } } }),
    ]);

    const items = rows.map((u) =>
      this.mapUserToListItem(u as UserListRow, frontendUrl),
    );

    const totalPages =
      total === 0 ? 0 : Math.ceil(total / safeLimit);

    return {
      items,
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
    };
  }
}
