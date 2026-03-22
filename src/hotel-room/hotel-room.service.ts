import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHotelRoomBulkDto } from './dto/create-hotel-room-bulk.dto';
import { CreateHotelRoomDto } from './dto/create-hotel-room.dto';
import { ListHotelRoomsQueryDto } from './dto/list-hotel-rooms-query.dto';

@Injectable()
export class HotelRoomService {
  constructor(private readonly prisma: PrismaService) {}

  findAvailable() {
    return this.prisma.hotelRoom.findMany({
      where: { isBooked: false, isReserved: false },
      orderBy: [{ hotelName: 'asc' }, { roomType: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findById(id: string) {
    return this.prisma.hotelRoom.findUnique({
      where: { id },
      include: {
        bookedBy: { select: { id: true, email: true, regType: true } },
      },
    });
  }

  async listAdmin(query: ListHotelRoomsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const skip = (page - 1) * pageSize;

    const where: Prisma.HotelRoomWhereInput = {
      ...(query.hotelName
        ? {
            hotelName: {
              contains: query.hotelName,
              mode: 'insensitive',
            },
          }
        : {}),
      ...(query.roomType
        ? {
            roomType: {
              contains: query.roomType,
              mode: 'insensitive',
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.hotelRoom.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ hotelName: 'asc' }, { createdAt: 'desc' }],
        include: {
          bookedBy: { select: { id: true, email: true, regType: true } },
        },
      }),
      this.prisma.hotelRoom.count({ where }),
    ]);

    return { items, page, pageSize, total };
  }

  createOne(dto: CreateHotelRoomDto) {
    return this.prisma.hotelRoom.create({
      data: {
        hotelName: dto.hotelName,
        roomType: dto.roomType,
        price: dto.price,
        description: dto.description,
        isReserved: dto.isReserved ?? false,
      },
    });
  }

  async createBulk(dto: CreateHotelRoomBulkDto) {
    const { quantity, ...rest } = dto;
    const base = {
      hotelName: rest.hotelName,
      roomType: rest.roomType,
      price: rest.price,
      isReserved: rest.isReserved ?? false,
    };
    const rows = Array.from({ length: quantity }, () => ({
      ...base,
      ...(rest.description != null && rest.description !== ''
        ? { description: rest.description }
        : {}),
    }));

    const result = await this.prisma.hotelRoom.createMany({ data: rows });
    return {
      created: result.count,
      hotelName: dto.hotelName,
      roomType: dto.roomType,
      price: dto.price,
    };
  }

  async reserve(id: string) {
    const room = await this.prisma.hotelRoom.findUnique({ where: { id } });
    if (!room) {
      throw new NotFoundException(`Hotel room ${id} not found`);
    }
    if (room.isBooked) {
      throw new BadRequestException('Room is already booked');
    }
    return this.prisma.hotelRoom.update({
      where: { id },
      data: { isReserved: true },
    });
  }

  async unreserve(id: string) {
    const room = await this.prisma.hotelRoom.findUnique({ where: { id } });
    if (!room) {
      throw new NotFoundException(`Hotel room ${id} not found`);
    }
    return this.prisma.hotelRoom.update({
      where: { id },
      data: { isReserved: false },
    });
  }

  async remove(id: string) {
    const room = await this.prisma.hotelRoom.findUnique({ where: { id } });
    if (!room) {
      throw new NotFoundException(`Hotel room ${id} not found`);
    }
    if (room.isBooked) {
      throw new BadRequestException('Cannot delete a booked room slot');
    }
    const pending = await this.prisma.payment.findFirst({
      where: {
        kind: 'hotel_room',
        hotelRoomId: id,
        status: 'pending',
      },
    });
    if (pending) {
      throw new BadRequestException(
        'Cannot delete: there is a pending payment for this room',
      );
    }
    await this.prisma.hotelRoom.delete({ where: { id } });
    return { deleted: true };
  }
}
