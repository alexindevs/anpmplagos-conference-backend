import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  RegType,
  SupportTicketCategory,
  SupportTicketStatus,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import type { Express } from 'express';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/auth.service';
import {
  CreateSupportTicketDto,
  RespondSupportTicketDto,
} from './dto';
import { SupportEmailService } from './support-email.service';

type CreateTicketFiles = {
  images?: Express.Multer.File[];
};

export type SupportTicketListItem = {
  id: string;
  title: string;
  category: SupportTicketCategory;
  status: SupportTicketStatus;
  createdAt: Date;
};

function categoryLabel(category: SupportTicketCategory): string {
  // User-facing labels for emails.
  switch (category) {
    case 'booth':
      return 'Booth';
    case 'masterclass':
      return 'Masterclass';
    case 'panel':
      return 'Panel';
    case 'presentation':
      return 'Presentation';
    case 'hotel_room':
      return 'Hotel room';
    case 'directory':
      return 'Directory';
    case 'registrations':
      return 'Registration';
    case 'sponsorship':
      return 'Sponsorship';
    case 'marketing_slots':
      return 'Marketing slots';
    case 'company_profile':
      return 'Company profile';
    case 'payments':
      return 'Payments';
    case 'other':
      return 'Other';
    default:
      return String(category);
  }
}

@Injectable()
export class SupportTicketService {
  private readonly logger = new Logger(SupportTicketService.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly cloudinary: CloudinaryService,
    private readonly emailService: SupportEmailService,
  ) {
    this.frontendUrl =
      this.config.get<string>('FRONTEND_URL', '').trim() ||
      'http://localhost:3000';
  }

  private ticketLink(ticketId: string): string {
    return `${this.frontendUrl}/support/ticket/${ticketId}`;
  }

  /**
   * Frontend profile URLs (match Next.js routes).
   */
  private profileLinkForUser(user: {
    regType: RegType;
    email: string;
    member: { slug: string; fullName: string } | null;
    attendee: { slug: string; fullName: string } | null;
    company: { slug: string; companyName: string } | null;
    admin: { name: string } | null;
  }): { profileName: string; profileUrl: string | null } {
    switch (user.regType) {
      case 'company':
        if (user.company) {
          return {
            profileName: user.company.companyName,
            profileUrl: `${this.frontendUrl}/company/${user.company.slug}`,
          };
        }
        break;
      case 'member':
        if (user.member) {
          return {
            profileName: user.member.fullName,
            profileUrl: `${this.frontendUrl}/member/${user.member.slug}`,
          };
        }
        break;
      case 'attendee':
        if (user.attendee) {
          return {
            profileName: user.attendee.fullName,
            profileUrl: `${this.frontendUrl}/attendee/${user.attendee.slug}`,
          };
        }
        break;
      case 'admin':
        return {
          profileName: user.admin?.name ?? user.email,
          profileUrl: null,
        };
      default:
        break;
    }
    return { profileName: user.email, profileUrl: null };
  }

  private submitterDisplayName(user: {
    regType: RegType;
    email: string;
    member: { fullName: string } | null;
    attendee: { fullName: string } | null;
    company: { companyName: string } | null;
    admin: { name: string } | null;
  }): string {
    switch (user.regType) {
      case 'company':
        return user.company?.companyName ?? user.email;
      case 'member':
        return user.member?.fullName ?? user.email;
      case 'attendee':
        return user.attendee?.fullName ?? user.email;
      case 'admin':
        return user.admin?.name ?? user.email;
      default:
        return user.email;
    }
  }

  private async uploadScreenshotFiles(
    files: Express.Multer.File[],
    folder: string,
  ): Promise<string[]> {
    const result: string[] = [];

    for (const file of files) {
      // CloudinaryService only supports PNG/JPG - files should already be validated.
      const url = await this.cloudinary.uploadBuffer(
        file.buffer,
        'support-tickets',
        `${folder}-${file.originalname}-${randomUUID().slice(0, 8)}`,
        file.mimetype,
      );
      result.push(url);
    }

    return result;
  }

  async createTicket(
    authUser: AuthUser,
    dto: CreateSupportTicketDto,
    files: CreateTicketFiles,
  ): Promise<{ id: string; status: SupportTicketStatus }> {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: authUser.id },
      include: {
        member: { select: { slug: true, fullName: true } },
        attendee: { select: { slug: true, fullName: true } },
        company: { select: { slug: true, companyName: true } },
        admin: { select: { name: true } },
      },
    });

    if (!dbUser) {
      throw new NotFoundException('User not found');
    }

    const ticketId = randomUUID();

    const ticket = await this.prisma.supportTicket.create({
      data: {
        id: ticketId,
        userId: authUser.id,
        title: dto.title,
        category: dto.category,
        description: dto.description,
        screenshotUrls: [],
        status: 'open',
      },
    });

    const screenshotFiles = files.images ?? [];
    let screenshotUrls: string[] = [];
    if (screenshotFiles.length) {
      screenshotUrls = await this.uploadScreenshotFiles(
        screenshotFiles,
        `ticket-${ticket.id}`,
      );

      await this.prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { screenshotUrls },
      });
    }

    // Email support team (non-blocking).
    try {
      const supportRecipients = this.emailService.getSupportRecipients();
      const ticketUrl = this.ticketLink(ticket.id);
      const { profileName, profileUrl } = this.profileLinkForUser(dbUser);
      const showProfileLink = Boolean(profileUrl);

      if (!supportRecipients.length) {
        this.logger.warn('SUPPORT_EMAILS is empty; skipping support email.');
      } else {
        const emailSubject = `[Support] ${dto.title} (Ticket ${ticket.id})`;
        await this.emailService.sendTicketCreatedEmail({
          to: supportRecipients,
          subject: emailSubject,
          context: {
            ticketId: ticket.id,
            title: dto.title,
            profileName,
            userEmail: dbUser.email,
            profileUrl: profileUrl ?? '',
            showProfileLink,
            categoryLabel: categoryLabel(dto.category),
            description: dto.description,
            ticketUrl,
            screenshots: screenshotUrls,
          },
        });
      }
    } catch (err) {
      this.logger.error(
        `Failed to send support ticket email for ${ticket.id}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }

    return { id: ticket.id, status: ticket.status };
  }

  async listMyTickets(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<{ items: SupportTicketListItem[]; page: number; pageSize: number; total: number }> {
    const where = { userId };
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          category: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return { items, page, pageSize, total };
  }

  async getMyTicket(
    userId: string,
    ticketId: string,
  ): Promise<{
    id: string;
    title: string;
    category: SupportTicketCategory;
    status: SupportTicketStatus;
    description: string;
    screenshotUrls: string[];
    createdAt: Date;
    responses: Array<{
      id: string;
      responseText: string;
      createdAt: Date;
      responderAdminId: string | null;
      responderAdminName: string | null;
    }>;
  }> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        responses: {
          orderBy: { createdAt: 'asc' },
          include: {
            responderAdmin: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!ticket || ticket.userId !== userId) {
      throw new NotFoundException('Ticket not found');
    }

    return {
      id: ticket.id,
      title: ticket.title,
      category: ticket.category,
      status: ticket.status,
      description: ticket.description,
      screenshotUrls: ticket.screenshotUrls,
      createdAt: ticket.createdAt,
      responses: ticket.responses.map((r) => ({
        id: r.id,
        responseText: r.responseText,
        createdAt: r.createdAt,
        responderAdminId: r.responderAdminId,
        responderAdminName: r.responderAdmin?.name ?? null,
      })),
    };
  }

  async listAdminTickets(
    page: number,
    pageSize: number,
  ): Promise<{
    items: Array<
      SupportTicketListItem & {
        userId: string;
        submitterDisplayName: string;
        submitterEmail: string;
        submitterRegType: RegType;
      }
    >;
    page: number;
    pageSize: number;
    total: number;
  }> {
    const skip = (page - 1) * pageSize;

    const [rows, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          category: true,
          status: true,
          createdAt: true,
          userId: true,
          user: {
            select: {
              email: true,
              regType: true,
              member: { select: { fullName: true } },
              attendee: { select: { fullName: true } },
              company: { select: { companyName: true } },
              admin: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.supportTicket.count(),
    ]);

    return {
      items: rows.map((r) => ({
        id: r.id,
        title: r.title,
        category: r.category,
        status: r.status,
        createdAt: r.createdAt,
        userId: r.userId,
        submitterDisplayName: this.submitterDisplayName(r.user),
        submitterEmail: r.user.email,
        submitterRegType: r.user.regType,
      })),
      page,
      pageSize,
      total,
    };
  }

  async getAdminTicket(ticketId: string): Promise<any> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          include: {
            member: { select: { slug: true, fullName: true } },
            attendee: { select: { slug: true, fullName: true } },
            company: { select: { slug: true, companyName: true } },
            admin: { select: { name: true } },
          },
        },
        responses: {
          orderBy: { createdAt: 'asc' },
          include: { responderAdmin: { select: { id: true, name: true } } },
        },
      },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    const { profileName, profileUrl } = this.profileLinkForUser(ticket.user);
    return {
      id: ticket.id,
      title: ticket.title,
      category: ticket.category,
      status: ticket.status,
      description: ticket.description,
      screenshotUrls: ticket.screenshotUrls,
      createdAt: ticket.createdAt,
      user: {
        id: ticket.user.id,
        email: ticket.user.email,
        regType: ticket.user.regType,
        submitterDisplayName: profileName,
        profileUrl,
      },
      responses: ticket.responses.map((r) => ({
        id: r.id,
        responseText: r.responseText,
        createdAt: r.createdAt,
        responderAdminId: r.responderAdminId,
        responderAdminName: r.responderAdmin?.name ?? null,
      })),
      ticketUrl: this.ticketLink(ticket.id),
    };
  }

  async respondToTicket(
    adminUser: AuthUser,
    ticketId: string,
    dto: RespondSupportTicketDto,
  ): Promise<{ id: string; status: SupportTicketStatus }> {
    const adminId = adminUser.admin?.id;
    if (!adminId) {
      throw new BadRequestException('Admin id missing in auth payload');
    }

    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          include: {
            member: { select: { slug: true, fullName: true } },
            attendee: { select: { slug: true, fullName: true } },
            company: { select: { slug: true, companyName: true } },
            admin: { select: { name: true } },
          },
        },
      },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    await this.prisma.supportTicketResponse.create({
      data: {
        ticketId,
        responderAdminId: adminId,
        responseText: dto.responseText,
      },
    });

    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: 'answered' },
    });

    const ticketUrl = this.ticketLink(ticketId);
    const { profileName, profileUrl } = this.profileLinkForUser(ticket.user);

    // Email user (non-blocking)
    try {
      if (ticket.user.email) {
        const subject = `Re: Support Ticket ${ticketId}`;
        await this.emailService.sendTicketAnsweredEmail({
          to: [ticket.user.email],
          subject,
          context: {
            title: ticket.title,
            ticketId,
            responseText: dto.responseText,
            ticketUrl,
            showProfileLink: Boolean(profileUrl),
            profileUrl: profileUrl ?? '',
            profileName,
          },
        });
      }
    } catch (err) {
      this.logger.error(
        `Failed to send ticket response email for ${ticketId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }

    return { id: ticketId, status: 'answered' };
  }
}

