import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMasterclassDto, UpdateMasterclassDto } from './dto';

@Injectable()
export class MasterclassService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.masterclass.findMany({
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
    const masterclass = await this.prisma.masterclass.findUnique({
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
    if (!masterclass) {
      throw new NotFoundException(`Masterclass with ID ${id} not found`);
    }
    return masterclass;
  }

  async create(dto: CreateMasterclassDto) {
    return this.prisma.masterclass.create({
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

  async update(id: string, dto: UpdateMasterclassDto) {
    const masterclass = await this.prisma.masterclass.findUnique({
      where: { id },
    });
    if (!masterclass) {
      throw new NotFoundException(`Masterclass with ID ${id} not found`);
    }

    const updateData: Record<string, unknown> = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.priceInKobo !== undefined) updateData.priceInKobo = dto.priceInKobo;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.isReserved !== undefined) updateData.isReserved = dto.isReserved;

    return this.prisma.masterclass.update({
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
    const masterclass = await this.prisma.masterclass.findUnique({
      where: { id },
    });
    if (!masterclass) {
      throw new NotFoundException(`Masterclass with ID ${id} not found`);
    }
    if (masterclass.isTaken) {
      throw new BadRequestException(
        'Cannot delete a masterclass slot that has been purchased',
      );
    }

    await this.prisma.masterclass.delete({
      where: { id },
    });

    return { message: 'Masterclass deleted successfully' };
  }
}
