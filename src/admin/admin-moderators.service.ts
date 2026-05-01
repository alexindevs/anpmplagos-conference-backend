import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SupportEmailService } from '../support/support-email.service';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class AdminModeratorsService {
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly emailService: SupportEmailService,
    private readonly authService: AuthService,
  ) {
    this.frontendUrl = this.config.get<string>('FRONTEND_URL') || '';
  }

  async invite(email: string): Promise<{ message: string }> {
    const normalised = email.trim().toLowerCase();

    // Check if account already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: normalised },
    });
    if (existing) {
      throw new BadRequestException(
        'An account with this email already exists',
      );
    }

    // Revoke any prior unused invites for this email
    await this.prisma.moderatorInvite.updateMany({
      where: { email: normalised, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.moderatorInvite.create({
      data: { email: normalised, token, expiresAt },
    });

    const inviteUrl = `${this.frontendUrl}/moderator/accept-invite?token=${token}`;
    await this.emailService.sendModeratorInviteEmail({
      to: normalised,
      inviteUrl,
    });

    return { message: `Invite sent to ${normalised}` };
  }

  async listModerators() {
    const moderators = await this.prisma.admin.findMany({
      where: { adminType: 'moderator' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Also fetch pending (unused, unexpired) invites
    const pendingInvites = await this.prisma.moderatorInvite.findMany({
      where: {
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      moderators: moderators.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.user.email,
        userId: m.user.id,
        avatar: m.avatar,
        status: 'active',
        createdAt: m.createdAt,
      })),
      pendingInvites: pendingInvites.map((i) => ({
        id: i.id,
        email: i.email,
        expiresAt: i.expiresAt,
        status: 'invited',
        createdAt: i.createdAt,
      })),
    };
  }

  async deactivateModerator(moderatorId: string): Promise<{ message: string }> {
    const mod = await this.prisma.admin.findUnique({
      where: { id: moderatorId },
      include: { user: true },
    });

    if (!mod || mod.adminType !== 'moderator') {
      throw new NotFoundException('Moderator not found');
    }

    // Revoke all refresh tokens → forces logout on all devices
    await this.authService.logoutAll(mod.userId);

    return { message: `Moderator ${mod.user.email} deactivated` };
  }

  async revokeInvite(inviteId: string): Promise<{ message: string }> {
    const invite = await this.prisma.moderatorInvite.findUnique({
      where: { id: inviteId },
    });
    if (!invite) throw new NotFoundException('Invite not found');

    await this.prisma.moderatorInvite.update({
      where: { id: inviteId },
      data: { usedAt: new Date() },
    });

    return { message: 'Invite revoked' };
  }
}
