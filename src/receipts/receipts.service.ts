import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/auth.service';
import { PaymentKind, PaymentStatus, Prisma } from '@prisma/client';
import { parseSponsorshipResolution } from '../sponsorship/sponsorship-bundle-resolution.service';

export interface ReceiptLineItem {
  type: string;
  title: string;
  quantity: number;
  unitPriceKobo: number;
  totalKobo: number;
  bundlePerks?: string[];
  bundleAllocations?: {
    booth?: { name: string; tier: string };
    masterclass?: { title: string; duration: string; day: string };
    presentation?: { title: string; duration: string; day: string };
    advertSlots?: { title: string }[];
    brandingSlots?: { title: string }[];
  };
}

export interface ReceiptData {
  id: string;
  reference: string;
  kind: PaymentKind;
  status: PaymentStatus;
  baseAmountKobo: number;
  totalAmountKobo: number;
  provider: string;
  paidAt: Date | null;
  createdAt: Date;
  user: {
    id: string;
    email: string;
    regType: string;
    name?: string;
  };
  company?: {
    id: string;
    companyName: string;
  };
  items: ReceiptLineItem[];
}

export interface PaginatedReceipts {
  data: ReceiptData[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class ReceiptsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly receiptInclude = Prisma.validator<Prisma.PaymentInclude>()({
    user: {
      include: {
        member: true,
        attendee: true,
        company: true,
      },
    },
    company: true,
    order: {
      include: {
        items: {
          include: {
            booth: true,
            masterclass: true,
            panelSession: true,
            presentation: true,
            sponsorshipPlan: true,
            hotelRoom: true,
            advertSlot: true,
            brandingSlot: true,
          },
        },
      },
    },
    booth: true,
    masterclass: true,
    panelSession: true,
    presentation: true,
    sponsorshipPlan: true,
    hotelRoom: true,
    advertSlot: true,
    brandingSlot: true,
  });

  private formatSessionDuration(duration: string): string {
    const map: Record<string, string> = {
      m10: '10 minutes',
      m15: '15 minutes',
      m20: '20 minutes',
      m30: '30 minutes',
      m45: '45 minutes',
      h1: '1 hour',
      h2: '2 hours',
    };
    return map[duration] || duration;
  }

  private formatConferenceDay(day: string): string {
    return day === 'day_1' ? 'Day 1' : 'Day 2';
  }

  private async formatReceipt(
    payment: Prisma.PaymentGetPayload<{
      include: {
        user: {
          include: {
            member: true;
            attendee: true;
            company: true;
          };
        };
        company: true;
        order: {
          include: {
            items: {
              include: {
                booth: true;
                masterclass: true;
                panelSession: true;
                presentation: true;
                sponsorshipPlan: true;
                hotelRoom: true;
                advertSlot: true;
                brandingSlot: true;
              };
            };
          };
        };
        booth: true;
        masterclass: true;
        panelSession: true;
        presentation: true;
        sponsorshipPlan: true;
        hotelRoom: true;
        advertSlot: true;
        brandingSlot: true;
      };
    }>,
  ): Promise<ReceiptData> {
    const items: ReceiptLineItem[] = [];

    if (payment.order?.items) {
      for (const orderItem of payment.order.items) {
        const lineItem: ReceiptLineItem = {
          type: orderItem.type,
          title: orderItem.titleSnapshot || 'Unknown Item',
          quantity: orderItem.quantity,
          unitPriceKobo: Number(orderItem.unitBaseAmountKobo),
          totalKobo: Number(orderItem.unitBaseAmountKobo) * orderItem.quantity,
        };

        if (orderItem.type === 'sponsorship_plan' && orderItem.sponsorshipPlan) {
          lineItem.bundlePerks = orderItem.sponsorshipPlan.perks;

          const resolution = parseSponsorshipResolution(
            payment.sponsorshipResolution,
          );
          if (resolution?.bundles) {
            const bundleEntry = resolution.bundles.find(
              (b) => b.sponsorshipPlanId === orderItem.sponsorshipPlanId,
            );

            if (bundleEntry) {
              const allocations: ReceiptLineItem['bundleAllocations'] = {};

              if (bundleEntry.boothId) {
                const booth = await this.prisma.booth.findUnique({
                  where: { id: bundleEntry.boothId },
                  select: { name: true, tier: true },
                });
                if (booth) {
                  allocations.booth = {
                    name: booth.name,
                    tier: booth.tier || 'default',
                  };
                }
              }

              if (bundleEntry.masterclassId) {
                const masterclass = await this.prisma.masterclass.findUnique({
                  where: { id: bundleEntry.masterclassId },
                  select: { title: true, slotDuration: true, conferenceDay: true },
                });
                if (masterclass) {
                  allocations.masterclass = {
                    title: masterclass.title,
                    duration: this.formatSessionDuration(masterclass.slotDuration),
                    day: this.formatConferenceDay(masterclass.conferenceDay),
                  };
                }
              }

              if (bundleEntry.presentationId) {
                const presentation = await this.prisma.presentation.findUnique({
                  where: { id: bundleEntry.presentationId },
                  select: { title: true, slotDuration: true, conferenceDay: true },
                });
                if (presentation) {
                  allocations.presentation = {
                    title: presentation.title,
                    duration: this.formatSessionDuration(presentation.slotDuration),
                    day: this.formatConferenceDay(presentation.conferenceDay),
                  };
                }
              }

              if (bundleEntry.advertSlotIds?.length) {
                const advertSlots = await this.prisma.advertSlot.findMany({
                  where: { id: { in: bundleEntry.advertSlotIds } },
                  select: { title: true },
                });
                allocations.advertSlots = advertSlots.map((a) => ({ title: a.title }));
              }

              if (bundleEntry.brandingSlotIds?.length) {
                const brandingSlots = await this.prisma.brandingSlot.findMany({
                  where: { id: { in: bundleEntry.brandingSlotIds } },
                  select: { title: true },
                });
                allocations.brandingSlots = brandingSlots.map((b) => ({ title: b.title }));
              }

              if (Object.keys(allocations).length > 0) {
                lineItem.bundleAllocations = allocations;
              }
            }
          }
        }

        items.push(lineItem);
      }
    } else if (payment.kind === 'registration') {
      items.push({
        type: 'registration',
        title: 'Conference Registration',
        quantity: 1,
        unitPriceKobo: Number(payment.baseAmount),
        totalKobo: Number(payment.baseAmount),
      });
    } else if (payment.kind === 'booth' && payment.booth) {
      items.push({
        type: 'booth',
        title: payment.booth.name,
        quantity: 1,
        unitPriceKobo: payment.booth.price,
        totalKobo: payment.booth.price,
      });
    } else if (payment.kind === 'masterclass' && payment.masterclass) {
      items.push({
        type: 'masterclass',
        title: payment.masterclass.title,
        quantity: 1,
        unitPriceKobo: payment.masterclass.priceInKobo,
        totalKobo: payment.masterclass.priceInKobo,
      });
    } else if (payment.kind === 'panel' && payment.panelSession) {
      items.push({
        type: 'panel',
        title: payment.panelSession.title,
        quantity: 1,
        unitPriceKobo: payment.panelSession.priceInKobo,
        totalKobo: payment.panelSession.priceInKobo,
      });
    } else if (payment.kind === 'presentation' && payment.presentation) {
      items.push({
        type: 'presentation',
        title: payment.presentation.title,
        quantity: 1,
        unitPriceKobo: payment.presentation.priceInKobo,
        totalKobo: payment.presentation.priceInKobo,
      });
    } else if (payment.kind === 'hotel_room' && payment.hotelRoom) {
      items.push({
        type: 'hotel_room',
        title: `${payment.hotelRoom.hotelName} — ${payment.hotelRoom.roomType}`,
        quantity: 1,
        unitPriceKobo: payment.hotelRoom.price,
        totalKobo: payment.hotelRoom.price,
      });
    } else if (payment.kind === 'sponsorship_plan' && payment.sponsorshipPlan) {
      items.push({
        type: 'sponsorship_plan',
        title: payment.sponsorshipPlan.name,
        quantity: 1,
        unitPriceKobo: Number(payment.sponsorshipPlan.priceInKobo),
        totalKobo: Number(payment.sponsorshipPlan.priceInKobo),
        bundlePerks: payment.sponsorshipPlan.perks,
      });
    } else if (payment.kind === 'advert_slot' && payment.advertSlot) {
      items.push({
        type: 'advert_slot',
        title: payment.advertSlot.title,
        quantity: 1,
        unitPriceKobo: payment.advertSlot.price,
        totalKobo: payment.advertSlot.price,
      });
    } else if (payment.kind === 'branding_slot' && payment.brandingSlot) {
      items.push({
        type: 'branding_slot',
        title: payment.brandingSlot.title,
        quantity: 1,
        unitPriceKobo: payment.brandingSlot.price,
        totalKobo: payment.brandingSlot.price,
      });
    }

    let userName: string | undefined;
    if (payment.user.member) {
      userName = payment.user.member.fullName;
    } else if (payment.user.attendee) {
      userName = payment.user.attendee.fullName;
    } else if (payment.user.company) {
      userName = payment.user.company.companyName;
    }

    return {
      id: payment.id,
      reference: payment.reference,
      kind: payment.kind,
      status: payment.status,
      baseAmountKobo: Number(payment.baseAmount),
      totalAmountKobo: Number(payment.amount),
      provider: payment.provider,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
      user: {
        id: payment.user.id,
        email: payment.user.email,
        regType: payment.user.regType,
        name: userName,
      },
      company: payment.company
        ? {
            id: payment.company.id,
            companyName: payment.company.companyName,
          }
        : undefined,
      items,
    };
  }

  async listUserReceipts(
    authUser: AuthUser,
    params: {
      page?: number;
      pageSize?: number;
      kind?: PaymentKind;
      status?: PaymentStatus;
      reference?: string;
    },
  ): Promise<PaginatedReceipts> {
    const page = params.page || 1;
    const pageSize = Math.min(params.pageSize || 20, 100);
    const skip = (page - 1) * pageSize;

    const where: Prisma.PaymentWhereInput = {
      userId: authUser.id,
    };

    if (params.kind) {
      where.kind = params.kind;
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.reference) {
      where.reference = { contains: params.reference, mode: 'insensitive' };
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: this.receiptInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.payment.count({ where }),
    ]);

    const data = await Promise.all(
      payments.map((p) => this.formatReceipt(p)),
    );

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async listAllReceipts(
    params: {
      page?: number;
      pageSize?: number;
      kind?: PaymentKind;
      status?: PaymentStatus;
      reference?: string;
    },
  ): Promise<PaginatedReceipts> {
    const page = params.page || 1;
    const pageSize = Math.min(params.pageSize || 20, 100);
    const skip = (page - 1) * pageSize;

    const where: Prisma.PaymentWhereInput = {};

    if (params.kind) {
      where.kind = params.kind;
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.reference) {
      where.reference = { contains: params.reference, mode: 'insensitive' };
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: this.receiptInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.payment.count({ where }),
    ]);

    const data = await Promise.all(
      payments.map((p) => this.formatReceipt(p)),
    );

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getReceiptById(
    paymentId: string,
    authUser: AuthUser,
  ): Promise<ReceiptData> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: this.receiptInclude,
    });

    if (!payment) {
      throw new NotFoundException('Receipt not found');
    }

    if (
      authUser.regType !== 'admin' &&
      payment.userId !== authUser.id
    ) {
      throw new ForbiddenException('You do not have access to this receipt');
    }

    return this.formatReceipt(payment);
  }

  async getReceiptByReference(
    reference: string,
    authUser: AuthUser,
  ): Promise<ReceiptData> {
    const payment = await this.prisma.payment.findUnique({
      where: { reference },
      include: this.receiptInclude,
    });

    if (!payment) {
      throw new NotFoundException('Receipt not found');
    }

    if (
      authUser.regType !== 'admin' &&
      payment.userId !== authUser.id
    ) {
      throw new ForbiddenException('You do not have access to this receipt');
    }

    return this.formatReceipt(payment);
  }
}
