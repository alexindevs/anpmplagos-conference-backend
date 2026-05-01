import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus, SponsorTier } from '@prisma/client';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';

export interface ScanResult {
  regType: 'member' | 'attendee' | 'company';
  userId: string;
  name: string;
  avatar: string | null;
  // member only
  hasSpouse?: boolean;
  spouseName?: string | null;
  spouseEmail?: string | null;
  spousePhone?: string | null;
  // company only
  tier?: string;
  maxEntries?: number;
  // all
  todayEntries: { entryIndex: number; markedAt: Date }[];
  alreadyFull: boolean;
}

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetch delegate details for moderator scan view.
   * todayEntries is scoped to the provided eventDayId if given,
   * otherwise returns entries across all active days today.
   */
  async getScanDetails(
    userId: string,
    eventDayId?: string,
  ): Promise<ScanResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        member: true,
        attendee: true,
        company: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');
    if (!['member', 'attendee', 'company'].includes(user.regType)) {
      throw new BadRequestException('This account cannot attend the conference');
    }

    // Get today's active day(s) for scoping entries
    const now = new Date();
    const startOfDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const dayFilter = eventDayId
      ? { eventDayId }
      : {
          eventDay: {
            isActive: true,
            date: { gte: startOfDay, lt: endOfDay },
          },
        };

    const todayRecords = await this.prisma.attendanceRecord.findMany({
      where: { userId, ...dayFilter },
      select: { entryIndex: true, markedAt: true },
      orderBy: { entryIndex: 'asc' },
    });

    if (user.regType === 'member' && user.member) {
      const maxEntries = user.member.hasSpouse ? 2 : 1;
      return {
        regType: 'member',
        userId,
        name: user.member.fullName,
        avatar: user.member.avatar,
        hasSpouse: user.member.hasSpouse,
        spouseName: user.member.spouseName,
        spouseEmail: user.member.spouseEmail,
        spousePhone: user.member.spousePhone,
        todayEntries: todayRecords,
        alreadyFull: todayRecords.length >= maxEntries,
      };
    }

    if (user.regType === 'attendee' && user.attendee) {
      return {
        regType: 'attendee',
        userId,
        name: user.attendee.fullName,
        avatar: user.attendee.avatar,
        todayEntries: todayRecords,
        alreadyFull: todayRecords.length >= 1,
      };
    }

    if (user.regType === 'company' && user.company) {
      const maxEntries = await this.resolveCompanyMaxEntries(user.company);
      return {
        regType: 'company',
        userId,
        name: user.company.companyName,
        avatar: user.company.logo,
        tier: user.company.highestSponsorshipTier ?? 'default',
        maxEntries,
        todayEntries: todayRecords,
        alreadyFull: todayRecords.length >= maxEntries,
      };
    }

    throw new BadRequestException('Could not resolve delegate profile');
  }

  async markAttendance(
    dto: MarkAttendanceDto,
    moderatorUserId: string,
  ): Promise<{ entryIndex: number; markedAt: Date; message: string }> {
    const { userId, eventDayId } = dto;

    // Verify the event day exists and is open for marking today
    const eventDay = await this.prisma.eventDay.findUnique({
      where: { id: eventDayId },
    });
    if (!eventDay) throw new NotFoundException('Conference day not found');
    if (!eventDay.isActive) {
      throw new BadRequestException('This conference day is not active');
    }

    const now = new Date();
    const startOfDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    if (eventDay.date < startOfDay || eventDay.date >= endOfDay) {
      throw new BadRequestException(
        "This conference day is not scheduled for today",
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        member: { select: { hasSpouse: true } },
        company: { select: { highestSponsorshipTier: true, id: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    // Compute max entries
    let maxEntries = 1;
    if (user.regType === 'member') {
      maxEntries = user.member?.hasSpouse ? 2 : 1;
    } else if (user.regType === 'attendee') {
      maxEntries = 1;
    } else if (user.regType === 'company' && user.company) {
      maxEntries = await this.resolveCompanyMaxEntriesById(
        user.company.id,
        user.company.highestSponsorshipTier,
      );
    } else {
      throw new BadRequestException(
        'This account type cannot be marked for attendance',
      );
    }

    // Count existing entries for this day
    const existingCount = await this.prisma.attendanceRecord.count({
      where: { userId, eventDayId },
    });

    if (existingCount >= maxEntries) {
      throw new ConflictException(
        user.regType === 'company'
          ? `All ${maxEntries} entry slots for this company have been used today`
          : existingCount === 1 && maxEntries === 1
            ? 'This delegate has already been marked as attending today'
            : 'All entry slots for this delegate have been used today',
      );
    }

    const nextIndex = existingCount + 1;

    const record = await this.prisma.attendanceRecord.create({
      data: {
        userId,
        eventDayId,
        markedById: moderatorUserId,
        entryIndex: nextIndex,
      },
    });

    return {
      entryIndex: record.entryIndex,
      markedAt: record.markedAt,
      message:
        user.regType === 'company'
          ? `Entry ${nextIndex} of ${maxEntries} recorded`
          : nextIndex === 2
            ? 'Spouse/plus-one entry recorded'
            : 'Attendance marked successfully',
    };
  }

  async getActiveDays() {
    const now = new Date();
    const startOfDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    return this.prisma.eventDay.findMany({
      where: {
        isActive: true,
        date: { gte: startOfDay, lt: endOfDay },
      },
      orderBy: { date: 'asc' },
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async resolveCompanyMaxEntries(company: {
    id: string;
    highestSponsorshipTier: SponsorTier | null;
  }): Promise<number> {
    return this.resolveCompanyMaxEntriesById(
      company.id,
      company.highestSponsorshipTier,
    );
  }

  private async resolveCompanyMaxEntriesById(
    companyId: string,
    tier: SponsorTier | null | undefined,
  ): Promise<number> {
    if (tier === SponsorTier.bronze) return 2;
    if (tier === SponsorTier.silver) return 3;
    if (
      tier === SponsorTier.gold ||
      tier === SponsorTier.platinum ||
      tier === SponsorTier.headliner
    ) {
      // Look up the most recently paid sponsorship plan's ticketAdmits
      const payment = await this.prisma.payment.findFirst({
        where: {
          companyId,
          status: PaymentStatus.success,
          kind: 'sponsorship_plan',
          sponsorshipPlan: {
            tier: {
              in: [SponsorTier.gold, SponsorTier.platinum, SponsorTier.headliner],
            },
          },
        },
        orderBy: { paidAt: 'desc' },
        include: { sponsorshipPlan: { select: { ticketAdmits: true } } },
      });
      return payment?.sponsorshipPlan?.ticketAdmits ?? 1;
    }
    return 1;
  }
}
