import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
import type { SignOptions } from 'jsonwebtoken';
import { LoginDto } from './dto';
import type { Prisma, RegType } from '@prisma/client';

const DEFAULT_ACCESS_EXPIRY = '15m';
const DEFAULT_REFRESH_EXPIRY_DAYS = 7;

export interface JwtPayload {
  sub: string;
  email: string;
  regType: RegType;
  purpose?: string; // 'admin_claim' for admin creation token
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expiresIn: string;
  user: AuthUser;
}

export interface AuthUser {
  id: string;
  email: string;
  regType: RegType;
  admin?: {
    id: string;
    name: string;
    adminType: string;
    avatar: string | null;
  };
  member?: { id: string; fullName: string };
  attendee?: { id: string; fullName: string };
  company?: { id: string; companyName: string };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { admin: true, member: true, attendee: true, company: true },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.issueTokens(user);
  }

  /** Issue access + refresh tokens (e.g. after company signup). */
  async issueTokensForUserId(
    userId: string,
    db: PrismaService | Prisma.TransactionClient = this.prisma,
  ): Promise<AuthTokens> {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        admin: true,
        member: true,
        attendee: true,
        company: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.issueTokens(user, db);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const tokenHash = this.hashToken(refreshToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            admin: true,
            member: true,
            attendee: true,
            company: true,
          },
        },
      },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(stored.user);
  }

  async logout(refreshToken: string): Promise<{ message: string }> {
    const tokenHash = this.hashToken(refreshToken);

    await this.prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });

    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId: string): Promise<{ message: string }> {
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { revokedAt: new Date() },
    });
    return { message: 'Logged out from all devices' };
  }

  private async issueTokens(user: {
    id: string;
    email: string;
    regType: RegType;
    admin?: {
      id: string;
      name: string;
      adminType: string;
      avatar: string | null;
    } | null;
    member?: { id: string; fullName: string } | null;
    attendee?: { id: string; fullName: string } | null;
    company?: { id: string; companyName: string } | null;
    },
    db: PrismaService | Prisma.TransactionClient = this.prisma,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      regType: user.regType,
    };

    const expiresInRaw = this.config.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
      DEFAULT_ACCESS_EXPIRY,
    );
    const expiresIn = (expiresInRaw ??
      DEFAULT_ACCESS_EXPIRY) as SignOptions['expiresIn'];
    const access_token = this.jwt.sign(payload, { expiresIn });

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      regType: user.regType,
    };
    if (user.admin)
      authUser.admin = {
        id: user.admin.id,
        name: user.admin.name,
        adminType: user.admin.adminType,
        avatar: user.admin.avatar,
      };
    if (user.member)
      authUser.member = { id: user.member.id, fullName: user.member.fullName };
    if (user.attendee)
      authUser.attendee = {
        id: user.attendee.id,
        fullName: user.attendee.fullName,
      };
    if (user.company)
      authUser.company = {
        id: user.company.id,
        companyName: user.company.companyName,
      };

    const refreshToken = randomUUID();
    const refreshExpiry = new Date();
    const refreshDays =
      Number(
        this.config.get('JWT_REFRESH_EXPIRY_DAYS', DEFAULT_REFRESH_EXPIRY_DAYS),
      ) || DEFAULT_REFRESH_EXPIRY_DAYS;
    refreshExpiry.setDate(refreshExpiry.getDate() + refreshDays);

    await db.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: refreshExpiry,
      },
    });

    return {
      access_token,
      refresh_token: refreshToken,
      expiresIn: String(expiresIn),
      user: authUser,
    };
  }

  async validateUser(payload: JwtPayload): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { admin: true, member: true, attendee: true, company: true },
    });
    if (!user) return null;

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      regType: user.regType,
    };
    if (user.admin)
      authUser.admin = {
        id: user.admin.id,
        name: user.admin.name,
        adminType: user.admin.adminType,
        avatar: user.admin.avatar,
      };
    if (user.member)
      authUser.member = { id: user.member.id, fullName: user.member.fullName };
    if (user.attendee)
      authUser.attendee = {
        id: user.attendee.id,
        fullName: user.attendee.fullName,
      };
    if (user.company)
      authUser.company = {
        id: user.company.id,
        companyName: user.company.companyName,
      };

    return authUser;
  }
}
