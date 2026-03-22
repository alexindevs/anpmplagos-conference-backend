import {
  Controller,
  Get,
  NotFoundException,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminService } from './admin.service';

@ApiTags('admins')
@Controller('api/admins')
export class AdminProfileController {
  constructor(private readonly adminService: AdminService) {}

  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get admin profile by admin id (admin only)' })
  @ApiResponse({ status: 200, description: 'Admin found' })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  async findById(@Param('id') id: string) {
    const admin = await this.adminService.findAdminById(id);
    if (!admin) {
      throw new NotFoundException(`Admin ${id} not found`);
    }
    return admin;
  }
}
