import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminStorageService } from './admin-storage.service';
import { AdminClaimGuard } from './admin-claim.guard';
import { ClaimAdminDto } from './dto/claim-admin.dto';
import { ParseAdminRegisterPipe } from './parse-admin-register.pipe';

interface AdminRegisterFiles {
  avatar?: {
    fieldname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
  }[];
}

@ApiTags('admin')
@Controller('api/admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly storage: AdminStorageService,
  ) {}

  @Post('claim')
  @ApiOperation({ summary: 'Exchange admin code for a one-time token' })
  @ApiBody({ type: ClaimAdminDto })
  @ApiResponse({ status: 200, description: 'Token for admin creation' })
  @ApiResponse({ status: 401, description: 'Invalid admin code' })
  claim(@Body() dto: ClaimAdminDto) {
    return this.adminService.claimToken(dto.code);
  }

  @Post('register')
  @UseGuards(AdminClaimGuard)
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'avatar', maxCount: 1 }], {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png'];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Only JPEG and PNG allowed'), false);
        }
      },
    }),
  )
  @ApiOperation({ summary: 'Create admin user (requires claim token)' })
  @ApiResponse({ status: 201, description: 'Admin created' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(
    @Body(ParseAdminRegisterPipe)
    dto: {
      email: string;
      password: string;
      name: string;
      adminType: 'superadmin';
    },
    @Req() req: { files?: AdminRegisterFiles },
  ) {
    const result = await this.adminService.createAdmin(
      { ...dto, adminType: 'superadmin' },
      undefined,
    );

    const avatarFile = req.files?.avatar?.[0];
    if (avatarFile && result.id) {
      const avatarPath = await this.storage.saveAdminAvatar(result.id, {
        fieldname: avatarFile.fieldname,
        mimetype: avatarFile.mimetype,
        size: avatarFile.size,
        buffer: avatarFile.buffer,
      });
      if (avatarPath) {
        await this.adminService.updateAdminAvatar(result.id, avatarPath);
      }
    }

    return result;
  }
}
