import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePanelDto, UpdatePanelDto } from './dto';

@Injectable()
export class PanelService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.panelSession.findMany({
      include: {
        takenBy: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const panel = await this.prisma.panelSession.findUnique({
      where: { id },
      include: {
        takenBy: {
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
        priceInKobo: dto.priceInKobo,
      },
      include: {
        takenBy: {
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

    const updateData: Record<string, unknown> = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.priceInKobo !== undefined) updateData.priceInKobo = dto.priceInKobo;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.isReserved !== undefined) updateData.isReserved = dto.isReserved;

    return this.prisma.panelSession.update({
      where: { id },
      data: updateData,
      include: {
        takenBy: {
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
    if (panel.isTaken) {
      throw new BadRequestException(
        'Cannot delete a panel slot that has been purchased',
      );
    }

    await this.prisma.panelSession.delete({
      where: { id },
    });

    return { message: 'Panel session deleted successfully' };
  }
}
