import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateHotelRoomBulkDto } from './dto/create-hotel-room-bulk.dto';
import { CreateHotelRoomDto } from './dto/create-hotel-room.dto';
import { ListHotelRoomsQueryDto } from './dto/list-hotel-rooms-query.dto';
import { HotelRoomService } from './hotel-room.service';

@ApiTags('admin')
@Controller('api/admin/hotel-rooms')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminHotelRoomController {
  constructor(private readonly hotelRoomService: HotelRoomService) {}

  @Get()
  @ApiOperation({ summary: 'List all hotel room slots (admin)' })
  list(@Query() query: ListHotelRoomsQueryDto) {
    return this.hotelRoomService.listAdmin(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Aggregate counts across all rooms (admin)' })
  stats() {
    return this.hotelRoomService.getAdminStats();
  }

  @Post()
  @ApiOperation({ summary: 'Create a single room slot (admin)' })
  @ApiBody({ type: CreateHotelRoomDto })
  @ApiResponse({ status: 201, description: 'Room slot created' })
  createOne(@Body() dto: CreateHotelRoomDto) {
    return this.hotelRoomService.createOne(dto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Create many identical room slots (admin)' })
  @ApiBody({ type: CreateHotelRoomBulkDto })
  @ApiResponse({ status: 201, description: 'Bulk slots created' })
  createBulk(@Body() dto: CreateHotelRoomBulkDto) {
    return this.hotelRoomService.createBulk(dto);
  }

  @Patch(':id/reserve')
  @ApiOperation({ summary: 'Reserve a slot (admin hold)' })
  reserve(@Param('id') id: string) {
    return this.hotelRoomService.reserve(id);
  }

  @Patch(':id/unreserve')
  @ApiOperation({ summary: 'Unreserve a slot' })
  unreserve(@Param('id') id: string) {
    return this.hotelRoomService.unreserve(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an unbooked slot' })
  remove(@Param('id') id: string) {
    return this.hotelRoomService.remove(id);
  }
}
