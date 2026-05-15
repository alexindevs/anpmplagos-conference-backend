import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { AdminType } from '@prisma/client';

const ADMIN_CLAIM_EXPIRY = '15m';

export interface CreateAdminDto {
  email: string;
  password: string;
  name: string;
  adminType: AdminType;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  claimToken(code: string): { token: string; expiresIn: string } {
    const adminCode = this.config.get<string>('ADMIN_CODE');
    if (!adminCode || code !== adminCode) {
      throw new UnauthorizedException('Invalid admin code');
    }
    const token = this.jwt.sign(
      { purpose: 'admin_claim', adminType: 'superadmin' },
      { expiresIn: ADMIN_CLAIM_EXPIRY },
    );
    return { token, expiresIn: ADMIN_CLAIM_EXPIRY };
  }

  async createAdmin(dto: CreateAdminDto, avatarPath?: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    if (dto.adminType !== 'superadmin') {
      throw new BadRequestException('Only superadmin is allowed for now');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        regType: 'admin',
        registrationStatus: 'registered',
      },
    });

    await this.prisma.admin.create({
      data: {
        userId: user.id,
        name: dto.name,
        adminType: dto.adminType,
        avatar: avatarPath,
      },
    });

    return {
      id: user.id,
      email: user.email,
      message: 'Admin created successfully',
    };
  }

  async updateAdminAvatar(userId: string, avatarPath: string) {
    await this.prisma.admin.updateMany({
      where: { userId },
      data: { avatar: avatarPath },
    });
  }

  async deleteOwnAccount(
    userId: string,
    password: string,
    adminCode: string,
  ): Promise<{ message: string }> {
    const expectedCode = this.config.get<string>('ADMIN_CODE');
    if (!expectedCode || adminCode !== expectedCode) {
      throw new UnauthorizedException('Invalid admin code');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    await this.prisma.user.delete({ where: { id: userId } });

    return { message: 'Account deleted successfully' };
  }

  async findAdminById(id: string) {
    return this.prisma.admin.findUnique({
      where: { id },
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
}
