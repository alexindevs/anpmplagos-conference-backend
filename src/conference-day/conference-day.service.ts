import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDayDto } from './dto/create-event-day.dto';
import { UpdateEventDayDto } from './dto/update-event-day.dto';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');

interface ReportRow {
  name: string;
  type: string;
  entry: string;
  checkinTime: string;
  markedBy: string;
}

interface DayGroup {
  label: string;
  date: Date;
  rows: ReportRow[];
}

@Injectable()
export class ConferenceDayService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEventDayDto) {
    return this.prisma.eventDay.create({
      data: {
        label: dto.label,
        date: new Date(dto.date),
        isActive: dto.isActive ?? false,
      },
    });
  }

  async findAll() {
    return this.prisma.eventDay.findMany({
      orderBy: { date: 'asc' },
      include: {
        _count: { select: { attendances: true } },
      },
    });
  }

  async findOne(id: string) {
    const day = await this.prisma.eventDay.findUnique({
      where: { id },
      include: {
        _count: { select: { attendances: true } },
      },
    });
    if (!day) throw new NotFoundException('Conference day not found');
    return day;
  }

  async update(id: string, dto: UpdateEventDayDto) {
    await this.findOne(id);
    return this.prisma.eventDay.update({
      where: { id },
      data: {
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.date !== undefined && { date: new Date(dto.date) }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.eventDay.delete({ where: { id } });
    return { message: 'Conference day deleted' };
  }

  /**
   * Returns all days where isActive=true AND date falls on today (UTC date).
   */
  async findActiveDays() {
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

  async getDayAttendance(
    dayId: string,
    page: number = 1,
    limit: number = 50,
  ) {
    await this.findOne(dayId);

    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.attendanceRecord.findMany({
        where: { eventDayId: dayId },
        skip,
        take: limit,
        orderBy: { markedAt: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              regType: true,
              email: true,
              member: { select: { fullName: true, avatar: true } },
              attendee: { select: { fullName: true, avatar: true } },
              company: { select: { companyName: true, logo: true } },
            },
          },
          markedBy: {
            select: {
              id: true,
              email: true,
              admin: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.attendanceRecord.count({ where: { eventDayId: dayId } }),
    ]);

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAttendanceSummary(dayId: string) {
    await this.findOne(dayId);

    const records = await this.prisma.attendanceRecord.findMany({
      where: { eventDayId: dayId },
      include: {
        user: { select: { regType: true } },
      },
    });

    const memberUserIds = new Set<string>();
    let memberEntries = 0;
    let spouseEntries = 0;
    const attendeeUserIds = new Set<string>();
    const companyUserIds = new Set<string>();
    let companyEntries = 0;

    for (const r of records) {
      if (r.user.regType === 'member') {
        memberUserIds.add(r.userId);
        if (r.entryIndex === 1) memberEntries++;
        if (r.entryIndex === 2) spouseEntries++;
      } else if (r.user.regType === 'attendee') {
        attendeeUserIds.add(r.userId);
      } else if (r.user.regType === 'company') {
        companyUserIds.add(r.userId);
        companyEntries++;
      }
    }

    return {
      members: {
        uniqueCheckedIn: memberUserIds.size,
        memberEntries,
        spouseEntries,
      },
      attendees: { uniqueCheckedIn: attendeeUserIds.size },
      companies: {
        uniqueCompanies: companyUserIds.size,
        totalEntries: companyEntries,
      },
    };
  }

  // ─── PDF Report ─────────────────────────────────────────────────────────────

  async generateAttendancePdf(
    eventDayId?: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const records = await this.prisma.attendanceRecord.findMany({
      where: eventDayId ? { eventDayId } : {},
      orderBy: [{ eventDay: { date: 'asc' } }, { markedAt: 'asc' }],
      include: {
        user: {
          select: {
            regType: true,
            member: { select: { fullName: true } },
            attendee: { select: { fullName: true } },
            company: { select: { companyName: true } },
          },
        },
        markedBy: {
          select: { admin: { select: { name: true } }, email: true },
        },
        eventDay: { select: { id: true, label: true, date: true } },
      },
    });

    // Group by day, preserving date order
    const dayMap = new Map<string, DayGroup>();
    for (const r of records) {
      const key = r.eventDay.id;
      if (!dayMap.has(key)) {
        dayMap.set(key, { label: r.eventDay.label, date: r.eventDay.date, rows: [] });
      }
      const u = r.user;
      const name =
        u.regType === 'member'
          ? (u.member?.fullName ?? '—')
          : u.regType === 'attendee'
            ? (u.attendee?.fullName ?? '—')
            : (u.company?.companyName ?? '—');

      const typeLabel =
        u.regType === 'member' ? 'Member' :
        u.regType === 'attendee' ? 'Attendee' : 'Company';

      const ordinals = ['', '1st', '2nd', '3rd'];
      const entry = r.entryIndex <= 3 ? (ordinals[r.entryIndex] ?? `${r.entryIndex}th`) : `${r.entryIndex}th`;

      const checkinTime = new Date(r.markedAt).toLocaleTimeString('en-NG', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      dayMap.get(key)!.rows.push({
        name,
        type: typeLabel,
        entry,
        checkinTime,
        markedBy: r.markedBy.admin?.name || r.markedBy.email,
      });
    }

    // If a specific day was requested but has no records, still show the day header
    if (eventDayId && !dayMap.has(eventDayId)) {
      const day = await this.prisma.eventDay.findUnique({ where: { id: eventDayId } });
      if (day) dayMap.set(eventDayId, { label: day.label, date: day.date, rows: [] });
    }

    const buffer = await this.renderPdf(dayMap, !!eventDayId);

    const firstDay = dayMap.values().next().value as DayGroup | undefined;
    const slug = eventDayId
      ? (firstDay?.label.replace(/\s+/g, '-').toLowerCase() ?? 'day')
      : 'all-days';
    const filename = `attendance-${slug}-${new Date().toISOString().slice(0, 10)}.pdf`;

    return { buffer, filename };
  }

  private renderPdf(
    dayMap: Map<string, DayGroup>,
    singleDay: boolean,
  ): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true });
      const buffers: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const PAGE_W = 595.28;
      const PAGE_H = 841.89;
      const M = 40; // margin
      const CONTENT_W = PAGE_W - M * 2;
      const ROW_H = 20;
      const HEAD_H = 24;

      // Column definitions
      const COLS = [
        { label: '#', w: 28 },
        { label: 'Name', w: 153 },
        { label: 'Type', w: 65 },
        { label: 'Entry', w: 42 },
        { label: 'Check-in Time', w: 115 },
        { label: 'Marked By', w: 112 },
      ];

      let y = M;

      const drawTableHeader = () => {
        doc.rect(M, y, CONTENT_W, HEAD_H).fill('#F1F5F9');
        let x = M;
        COLS.forEach((col) => {
          doc
            .fontSize(7)
            .font('Helvetica-Bold')
            .fillColor('#475569')
            .text(col.label.toUpperCase(), x + 4, y + 8, {
              width: col.w - 8,
              lineBreak: false,
            });
          x += col.w;
        });
        y += HEAD_H;
      };

      const checkPage = (neededHeight: number) => {
        if (y + neededHeight > PAGE_H - M) {
          doc.addPage({ margin: 0 });
          y = M;
          return true;
        }
        return false;
      };

      // ── Document header ──────────────────────────────────────────────────
      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .fillColor('#181112')
        .text('ANPMP AGM/Scientific Conference 2026', M, y);
      y += 20;

      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor('#64748B')
        .text('Attendance Report', M, y);
      y += 16;

      const scope = singleDay
        ? (dayMap.values().next().value as DayGroup | undefined)?.label ?? 'Selected Day'
        : 'All Conference Days';

      doc
        .fontSize(8)
        .fillColor('#94A3B8')
        .text(
          `Scope: ${scope}   ·   Generated: ${new Date().toLocaleString('en-NG', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}`,
          M,
          y,
        );
      y += 14;

      // Divider
      doc.moveTo(M, y).lineTo(PAGE_W - M, y).strokeColor('#E2E8F0').lineWidth(0.75).stroke();
      y += 14;

      // ── Day sections ─────────────────────────────────────────────────────
      for (const [, day] of dayMap) {
        checkPage(HEAD_H + ROW_H + 40);

        // Section label
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#C41E3A')
          .text(
            `${day.label}  —  ${new Date(day.date).toLocaleDateString('en-NG', { dateStyle: 'long' })}`,
            M,
            y,
          );
        y += 14;

        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor('#64748B')
          .text(
            `${day.rows.length} check-in${day.rows.length !== 1 ? 's' : ''}`,
            M,
            y,
          );
        y += 12;

        if (day.rows.length === 0) {
          doc
            .fontSize(8)
            .fillColor('#94A3B8')
            .text('No attendance records for this day.', M + 4, y);
          y += 20;
          continue;
        }

        // Table header
        drawTableHeader();

        // Rows
        day.rows.forEach((row, idx) => {
          checkPage(ROW_H);

          // Zebra stripe
          if (idx % 2 === 1) {
            doc.rect(M, y, CONTENT_W, ROW_H).fill('#F8FAFC');
          }

          const cells = [
            String(idx + 1),
            row.name,
            row.type,
            row.entry,
            row.checkinTime,
            row.markedBy,
          ];

          let x = M;
          COLS.forEach((col, ci) => {
            doc
              .fontSize(8)
              .font('Helvetica')
              .fillColor('#1E293B')
              .text(cells[ci], x + 4, y + 6, {
                width: col.w - 8,
                lineBreak: false,
                ellipsis: true,
              });
            x += col.w;
          });

          // Row separator
          doc
            .moveTo(M, y + ROW_H)
            .lineTo(PAGE_W - M, y + ROW_H)
            .strokeColor('#F1F5F9')
            .lineWidth(0.5)
            .stroke();

          y += ROW_H;
        });

        y += 18;
      }

      // ── Grand total (multi-day only) ─────────────────────────────────────
      if (!singleDay) {
        const total = [...dayMap.values()].reduce((s, d) => s + d.rows.length, 0);
        checkPage(30);
        doc.moveTo(M, y).lineTo(PAGE_W - M, y).strokeColor('#E2E8F0').lineWidth(0.75).stroke();
        y += 8;
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor('#1E293B')
          .text(`Total check-ins across all days: ${total}`, M, y);
      }

      doc.end();
    });
  }
}
