import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import {
  PaymentKind,
  PaymentStatus,
  RegistrationStatus,
  type EventPassType,
} from '@prisma/client';

const NON_HOTEL_COMMERCE_KINDS: PaymentKind[] = [
  PaymentKind.booth,
  PaymentKind.masterclass,
  PaymentKind.panel,
  PaymentKind.presentation,
  PaymentKind.sponsorship_plan,
  PaymentKind.advert_slot,
  PaymentKind.branding_slot,
];

@Injectable()
export class EventPassService {
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {
    this.frontendUrl = this.config.get<string>('FRONTEND_URL') || '';
  }

  async generateConferencePass(userId: string): Promise<{ qrCodeUrl: string }> {
    await this.checkConferenceEligibility(userId);

    const existingPass = await this.prisma.eventPass.findUnique({
      where: { userId_type: { userId, type: 'conference' } },
    });

    if (existingPass) {
      return { qrCodeUrl: existingPass.qrCodeUrl };
    }

    const qrCodeUrl = await this.generateAndUploadQRCode(
      userId,
      'conference',
      `${this.frontendUrl}/moderator/scan/${userId}`,
    );

    await this.prisma.eventPass.create({
      data: {
        userId,
        type: 'conference',
        qrCodeUrl,
      },
    });

    return { qrCodeUrl };
  }

  async generateHotelPass(userId: string): Promise<{ qrCodeUrl: string }> {
    await this.checkHotelEligibility(userId);

    const existingPass = await this.prisma.eventPass.findUnique({
      where: { userId_type: { userId, type: 'hotel' } },
    });

    if (existingPass) {
      return { qrCodeUrl: existingPass.qrCodeUrl };
    }

    const qrCodeUrl = await this.generateAndUploadQRCode(
      userId,
      'hotel',
      `${this.frontendUrl}/hotel/${userId}`,
    );

    await this.prisma.eventPass.create({
      data: {
        userId,
        type: 'hotel',
        qrCodeUrl,
      },
    });

    return { qrCodeUrl };
  }

  async getConferencePassData(
    userId: string,
    incrementView: boolean = false,
  ): Promise<{
    avatar: string | null;
    name: string;
    ticketType: string;
    bio: string | null;
    qrCodeUrl: string;
    viewCount: number;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        member: true,
        attendee: true,
        company: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const eventPass = await this.prisma.eventPass.findUnique({
      where: { userId_type: { userId, type: 'conference' } },
    });

    if (!eventPass) {
      throw new NotFoundException('Conference pass not found for this user');
    }

    if (incrementView && user.regType === 'company') {
      if (eventPass.viewCount >= 5) {
        throw new ForbiddenException(
          'View limit reached for this conference pass',
        );
      }

      await this.prisma.eventPass.update({
        where: { id: eventPass.id },
        data: { viewCount: { increment: 1 } },
      });
    }

    let avatar: string | null = null;
    let name = '';
    let bio: string | null = null;

    if (user.regType === 'member' && user.member) {
      avatar = user.member.avatar;
      name = user.member.fullName;
      bio = user.member.bio;
    } else if (user.regType === 'attendee' && user.attendee) {
      avatar = user.attendee.avatar;
      name = user.attendee.fullName;
      bio = user.attendee.bio;
    } else if (user.regType === 'company' && user.company) {
      avatar = user.company.logo;
      name = user.company.companyName;
      bio = user.company.description || null;
    }

    return {
      avatar,
      name,
      ticketType: user.regType,
      bio,
      qrCodeUrl: eventPass.qrCodeUrl,
      viewCount: incrementView ? eventPass.viewCount + 1 : eventPass.viewCount,
    };
  }

  async getHotelPassData(userId: string): Promise<{
    name: string;
    avatar: string | null;
    hotels: Array<{
      hotelName: string;
      rooms: Array<{ roomType: string }>;
    }>;
    qrCodeUrl: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        member: true,
        attendee: true,
        company: true,
        hotelRoomsBooked: {
          where: { isBooked: true },
          select: {
            hotelName: true,
            roomType: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const eventPass = await this.prisma.eventPass.findUnique({
      where: { userId_type: { userId, type: 'hotel' } },
    });

    if (!eventPass) {
      throw new NotFoundException('Hotel pass not found for this user');
    }

    let avatar: string | null = null;
    let name = '';

    if (user.regType === 'member' && user.member) {
      avatar = user.member.avatar;
      name = user.member.fullName;
    } else if (user.regType === 'attendee' && user.attendee) {
      avatar = user.attendee.avatar;
      name = user.attendee.fullName;
    } else if (user.regType === 'company' && user.company) {
      avatar = user.company.logo;
      name = user.company.companyName;
    }

    const hotelMap = new Map<string, Array<{ roomType: string }>>();

    for (const room of user.hotelRoomsBooked) {
      if (!hotelMap.has(room.hotelName)) {
        hotelMap.set(room.hotelName, []);
      }
      hotelMap.get(room.hotelName)!.push({ roomType: room.roomType });
    }

    const hotels = Array.from(hotelMap.entries()).map(([hotelName, rooms]) => ({
      hotelName,
      rooms,
    }));

    return {
      name,
      avatar,
      hotels,
      qrCodeUrl: eventPass.qrCodeUrl,
    };
  }

  async getUserPasses(userId: string): Promise<{
    conferencePass?: {
      qrCodeUrl: string;
      viewCount: number;
      createdAt: Date;
    };
    hotelPass?: {
      qrCodeUrl: string;
      createdAt: Date;
    };
  }> {
    const passes = await this.prisma.eventPass.findMany({
      where: { userId },
      select: {
        type: true,
        qrCodeUrl: true,
        viewCount: true,
        createdAt: true,
      },
    });

    const result: {
      conferencePass?: {
        qrCodeUrl: string;
        viewCount: number;
        createdAt: Date;
      };
      hotelPass?: {
        qrCodeUrl: string;
        createdAt: Date;
      };
    } = {};

    for (const pass of passes) {
      if (pass.type === 'conference') {
        result.conferencePass = {
          qrCodeUrl: pass.qrCodeUrl,
          viewCount: pass.viewCount,
          createdAt: pass.createdAt,
        };
      } else if (pass.type === 'hotel') {
        result.hotelPass = {
          qrCodeUrl: pass.qrCodeUrl,
          createdAt: pass.createdAt,
        };
      }
    }

    return result;
  }

  /**
   * Conference pass purchase eligibility for the signed-in user:
   * - **Company:** at least one **successful** non-hotel commerce payment (same rules as `getCompanyPassPurchaseEligibility`).
   * - **Member / attendee:** registration completed (`registrationStatus === registered`), i.e. registration paid.
   */
  async getPassPurchaseEligibility(params: {
    regType: string;
    userId: string;
    companyId: string | null | undefined;
  }): Promise<{ isEligible: boolean }> {
    if (params.regType === 'company') {
      if (!params.companyId) {
        throw new ForbiddenException('Company account required');
      }
      return this.getCompanyPassPurchaseEligibility(params.companyId);
    }
    if (params.regType === 'member' || params.regType === 'attendee') {
      const user = await this.prisma.user.findUnique({
        where: { id: params.userId },
        select: { registrationStatus: true },
      });
      return {
        isEligible: user?.registrationStatus === RegistrationStatus.registered,
      };
    }
    throw new ForbiddenException(
      'Company, member, or attendee account required',
    );
  }

  /**
   * Company is eligible for pass flows that require a non-hotel commerce purchase
   * if it has at least one **successful** payment that is not a hotel room and not a hotel-only cart order.
   */
  async getCompanyPassPurchaseEligibility(
    companyId: string,
  ): Promise<{ isEligible: boolean }> {
    const count = await this.prisma.payment.count({
      where: {
        companyId,
        status: PaymentStatus.success,
        OR: [
          { kind: { in: NON_HOTEL_COMMERCE_KINDS } },
          {
            kind: PaymentKind.order,
            order: { cartKind: 'conference' },
          },
        ],
      },
    });
    return { isEligible: count > 0 };
  }

  private async checkConferenceEligibility(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: { select: { id: true } },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.regType === 'member' || user.regType === 'attendee') {
      if (user.registrationStatus !== 'registered') {
        throw new BadRequestException(
          'You must complete registration payment before generating a conference pass',
        );
      }
    } else if (user.regType === 'company') {
      const companyId = user.company?.id;
      if (!companyId) {
        throw new BadRequestException('Company profile not found');
      }
      const { isEligible } =
        await this.getCompanyPassPurchaseEligibility(companyId);
      if (!isEligible) {
        throw new BadRequestException(
          'Company must complete a qualifying purchase on the platform (any conference commerce except hotel) before generating a conference pass',
        );
      }
    } else {
      throw new BadRequestException(
        'Only members, attendees, and companies can generate conference passes',
      );
    }
  }

  private async checkHotelEligibility(userId: string): Promise<void> {
    const bookedRooms = await this.prisma.hotelRoom.count({
      where: {
        bookedById: userId,
        isBooked: true,
      },
    });

    if (bookedRooms === 0) {
      throw new BadRequestException(
        'You must have at least one hotel room booking to generate a hotel pass',
      );
    }
  }

  /**
   * One-time migration: regenerate all existing conference QR codes to use
   * the new /moderator/scan/{userId} URL. Call once after deploy.
   */
  async regenerateAllConferenceQRCodes(): Promise<{ updated: number }> {
    const passes = await this.prisma.eventPass.findMany({
      where: { type: 'conference' },
      select: { id: true, userId: true },
    });

    let updated = 0;
    for (const pass of passes) {
      try {
        const newUrl = await this.generateAndUploadQRCode(
          pass.userId,
          'conference',
          `${this.frontendUrl}/moderator/scan/${pass.userId}`,
        );
        await this.prisma.eventPass.update({
          where: { id: pass.id },
          data: { qrCodeUrl: newUrl },
        });
        updated++;
      } catch {
        // Continue on individual failures
      }
    }

    return { updated };
  }

  private async generateAndUploadQRCode(
    userId: string,
    type: EventPassType,
    url: string,
  ): Promise<string> {
    const qrCodeBuffer = await QRCode.toBuffer(url, {
      type: 'png',
      width: 512,
      margin: 2,
      errorCorrectionLevel: 'H',
    });

    const qrCodeUrl = await this.storage.uploadBuffer(
      qrCodeBuffer,
      `event-passes/${userId}`,
      type,
      'image/png',
    );

    return qrCodeUrl;
  }
}
