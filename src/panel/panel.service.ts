import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePanelDto, UpdatePanelDto } from './dto';

@Injectable()
export class PanelService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.panelSession.findMany({
      include: {
        sponsor: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async findOne(id: string) {
    const panel = await this.prisma.panelSession.findUnique({
      where: { id },
      include: {
        sponsor: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    });
    if (!panel) {
      throw new NotFoundException(`Panel session with ID ${id} not found`);
    }
    return panel;
  }

  async create(dto: CreatePanelDto) {
    return this.prisma.panelSession.create({
      data: {
        title: dto.title,
        description: dto.description,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        location: dto.location,
        priceInKobo: dto.priceInKobo,
      },
      include: {
        sponsor: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    });
  }

  async update(id: string, dto: UpdatePanelDto) {
    const panel = await this.prisma.panelSession.findUnique({
      where: { id },
    });
    if (!panel) {
      throw new NotFoundException(`Panel session with ID ${id} not found`);
    }

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.startTime !== undefined) updateData.startTime = new Date(dto.startTime);
    if (dto.endTime !== undefined) updateData.endTime = new Date(dto.endTime);
    if (dto.location !== undefined) updateData.location = dto.location;
    if (dto.priceInKobo !== undefined) updateData.priceInKobo = dto.priceInKobo;
    if (dto.sponsorId !== undefined) updateData.sponsorId = dto.sponsorId;
    if (dto.status !== undefined) updateData.status = dto.status;

    return this.prisma.panelSession.update({
      where: { id },
      data: updateData,
      include: {
        sponsor: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    });
  }

  async delete(id: string) {
    const panel = await this.prisma.panelSession.findUnique({
      where: { id },
    });
    if (!panel) {
      throw new NotFoundException(`Panel session with ID ${id} not found`);
    }

    await this.prisma.panelSession.delete({
      where: { id },
    });

    return { message: 'Panel session deleted successfully' };
  }
}
