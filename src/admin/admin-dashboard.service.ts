import { Injectable } from '@nestjs/common';
import { Prisma, RegType } from '@prisma/client';
import { BoothService } from '../booth/booth.service';
import { PrismaService } from '../prisma/prisma.service';

/** How many latest users to return on the dashboard summary */
export const RECENT_REGISTRATIONS_LIMIT = 20;

const REG_TYPE_LABELS: Record<RegType, string> = {
  member: 'Member',
  attendee: 'Attendee',
  exhibitor: 'Exhibitor',
  admin: 'Administrator',
  sponsor: 'Sponsor',
};

const recentUserSelect = {
  id: true,
  email: true,
  regType: true,
  createdAt: true,
  member: { select: { fullName: true, avatar: true } },
  attendee: { select: { fullName: true, avatar: true } },
  exhibitor: { select: { companyName: true, profileImage: true } },
  sponsor: { select: { companyName: true, logo: true } },
  admin: { select: { name: true, avatar: true } },
} satisfies Prisma.UserSelect;

type RecentUserRow = Prisma.UserGetPayload<{
  select: typeof recentUserSelect;
}>;

export type RecentRegistrationItem = {
  userId: string;
  name: string;
  profilePicture: string | null;
  regType: RegType;
  regTypeLabel: string;
  createdAt: Date;
};

export type {
  BoothAdminOccupant as DashboardBoothOccupant,
  BoothAdminListItem as DashboardBoothItem,
} from '../booth/booth.service';

@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boothService: BoothService,
  ) {}

  private displayName(user: RecentUserRow): string {
    switch (user.regType) {
      case 'member':
        return user.member?.fullName ?? user.email;
      case 'attendee':
        return user.attendee?.fullName ?? user.email;
      case 'exhibitor':
        return user.exhibitor?.companyName ?? user.email;
      case 'sponsor':
        return user.sponsor?.companyName ?? user.email;
      case 'admin':
        return user.admin?.name ?? user.email;
      default:
        return user.email;
    }
  }

  private profilePicture(user: RecentUserRow): string | null {
    switch (user.regType) {
      case 'member':
        return user.member?.avatar ?? null;
      case 'attendee':
        return user.attendee?.avatar ?? null;
      case 'exhibitor':
        return user.exhibitor?.profileImage ?? null;
      case 'sponsor':
        return user.sponsor?.logo ?? null;
      case 'admin':
        return user.admin?.avatar ?? null;
      default:
        return null;
    }
  }

  private toRecentRegistration(user: RecentUserRow): RecentRegistrationItem {
    return {
      userId: user.id,
      name: this.displayName(user),
      profilePicture: this.profilePicture(user),
      regType: user.regType,
      regTypeLabel: REG_TYPE_LABELS[user.regType],
      createdAt: user.createdAt,
    };
  }

  async getSummary() {
    const [
      totalRegistrations,
      totalMembers,
      totalAttendees,
      totalExhibitors,
      totalSponsors,
      totalBooths,
      availableBooths,
      reservedBooths,
      takenBooths,
      totalMasterclasses,
      totalPanels,
      sponsors,
      recentUsers,
      boothsAll,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.member.count(),
      this.prisma.attendee.count(),
      this.prisma.exhibitor.count(),
      this.prisma.sponsor.count(),
      this.prisma.booth.count(),
      this.prisma.booth.count({ where: { isTaken: false, isReserved: false } }),
      this.prisma.booth.count({ where: { isReserved: true } }),
      this.prisma.booth.count({ where: { isTaken: true } }),
      this.prisma.masterclass.count(),
      this.prisma.panelSession.count(),
      this.prisma.sponsor.findMany({
        where: { sponsorAmount: { not: null } },
        select: { sponsorAmount: true, status: true },
      }),
      this.prisma.user.findMany({
        take: RECENT_REGISTRATIONS_LIMIT,
        orderBy: { createdAt: 'desc' },
        select: recentUserSelect,
      }),
      this.boothService.findAllForAdmin(),
    ]);

    const totalPledged = sponsors.reduce((sum, s) => sum + (s.sponsorAmount ?? 0), 0);
    const totalActiveSponsorAmount = sponsors
      .filter((s) => s.status === 'active')
      .reduce((sum, s) => sum + (s.sponsorAmount ?? 0), 0);
    const activeSponsors = sponsors.filter((s) => s.status === 'active').length;

    const recentRegistrations = recentUsers.map((u) => this.toRecentRegistration(u));

    return {
      recentRegistrations,
      registrations: {
        total: totalRegistrations,
        members: totalMembers,
        attendees: totalAttendees,
        exhibitors: totalExhibitors,
        sponsors: totalSponsors,
      },
      booths: {
        total: totalBooths,
        available: availableBooths,
        reserved: reservedBooths,
        occupied: takenBooths,
        all: boothsAll,
      },
      sessions: {
        masterclasses: totalMasterclasses,
        panels: totalPanels,
      },
      sponsorships: {
        totalSponsors: totalSponsors,
        activeSponsors: activeSponsors,
        totalPledged: totalPledged,
        totalActive: totalActiveSponsorAmount,
      },
    };
  }
}
