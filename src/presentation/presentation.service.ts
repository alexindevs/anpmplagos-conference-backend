import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePresentationDto, UpdatePresentationDto } from './dto';

@Injectable()
export class PresentationService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.presentation.findMany({
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
    const row = await this.prisma.presentation.findUnique({
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
    if (!row) {
      throw new NotFoundException(`Presentation with ID ${id} not found`);
    }
    return row;
  }

  async create(dto: CreatePresentationDto) {
    return this.prisma.presentation.create({
      data: {
        title: dto.title,
        description: dto.description,
        priceInKobo: dto.priceInKobo,
        slotDuration: dto.slotDuration,
        conferenceDay: dto.conferenceDay,
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

  async update(id: string, dto: UpdatePresentationDto) {
    const row = await this.prisma.presentation.findUnique({
      where: { id },
    });
    if (!row) {
      throw new NotFoundException(`Presentation with ID ${id} not found`);
    }

    const updateData: Record<string, unknown> = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.priceInKobo !== undefined) updateData.priceInKobo = dto.priceInKobo;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.isReserved !== undefined) updateData.isReserved = dto.isReserved;
    if (dto.slotDuration !== undefined) {
      updateData.slotDuration = dto.slotDuration;
    }
    if (dto.conferenceDay !== undefined) {
      updateData.conferenceDay = dto.conferenceDay;
    }

    return this.prisma.presentation.update({
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
    const row = await this.prisma.presentation.findUnique({
      where: { id },
    });
    if (!row) {
      throw new NotFoundException(`Presentation with ID ${id} not found`);
    }
    if (row.isTaken) {
      throw new BadRequestException(
        'Cannot delete a presentation slot that has been purchased',
      );
    }

    await this.prisma.presentation.delete({
      where: { id },
    });

    return { message: 'Presentation deleted successfully' };
  }
}
