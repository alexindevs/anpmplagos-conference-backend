import { Injectable } from '@nestjs/common';
import { Prisma, RegType } from '@prisma/client';
import { BoothService } from '../booth/booth.service';
import { PrismaService } from '../prisma/prisma.service';

/** How many latest users to return on the dashboard summary */
export const RECENT_REGISTRATIONS_LIMIT = 20;

const REG_TYPE_LABELS: Record<RegType, string> = {
  member: 'Member',
  attendee: 'Attendee',
  company: 'Company',
  admin: 'Administrator',
};

const recentUserSelect = {
  id: true,
  email: true,
  regType: true,
  createdAt: true,
  member: { select: { fullName: true, avatar: true } },
  attendee: { select: { fullName: true, avatar: true } },
  company: { select: { companyName: true, logo: true } },
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
      case 'company':
        return user.company?.companyName ?? user.email;
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
      case 'company':
        return user.company?.logo ?? null;
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
      totalCompanies,
      totalBooths,
      availableBooths,
      reservedBooths,
      takenBooths,
      totalMasterclasses,
      totalPanels,
      totalPresentations,
      sponsorshipPlanRevenue,
      recentUsers,
      boothsAll,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.member.count(),
      this.prisma.attendee.count(),
      this.prisma.company.count(),
      this.prisma.booth.count(),
      this.prisma.booth.count({ where: { isTaken: false, isReserved: false } }),
      this.prisma.booth.count({ where: { isReserved: true } }),
      this.prisma.booth.count({ where: { isTaken: true } }),
      this.prisma.masterclass.count(),
      this.prisma.panelSession.count(),
      this.prisma.presentation.count(),
      this.prisma.payment.aggregate({
        where: { kind: 'sponsorship_plan', status: 'success' },
        _sum: { baseAmount: true },
      }),
      this.prisma.user.findMany({
        take: RECENT_REGISTRATIONS_LIMIT,
        orderBy: { createdAt: 'desc' },
        select: recentUserSelect,
      }),
      this.boothService.findAllForAdmin(),
    ]);

    const recentRegistrations = recentUsers.map((u) =>
      this.toRecentRegistration(u),
    );

    const companySponsorshipTotals = await this.prisma.company.aggregate({
      _sum: { sponsorshipPaidTotalKobo: true },
    });

    return {
      recentRegistrations,
      registrations: {
        total: totalRegistrations,
        members: totalMembers,
        attendees: totalAttendees,
        companies: totalCompanies,
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
        presentations: totalPresentations,
      },
      sponsorships: {
        companyAccounts: totalCompanies,
        paidPlanRevenueKobo: Number(
          sponsorshipPlanRevenue._sum.baseAmount ?? 0,
        ),
        recordedSponsorshipPaidTotalKobo: Number(
          companySponsorshipTotals._sum.sponsorshipPaidTotalKobo ?? 0,
        ),
      },
    };
  }
}
