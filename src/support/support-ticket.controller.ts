import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/auth.service';
import { CreateSupportTicketDto, ListSupportTicketsQueryDto } from './dto';
import { SupportTicketService } from './support-ticket.service';

type AuthedReq = Request & {
  user: AuthUser;
  files?: { images?: Express.Multer.File[] };
};

@ApiTags('Support Tickets')
@Controller('api/support')
export class SupportTicketController {
  constructor(private readonly supportTickets: SupportTicketService) {}

  @Post('tickets')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'images', maxCount: 10 }], {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png'];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Only JPEG and PNG images allowed'), false);
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Create a support ticket (any signed-in account; multipart/form-data)',
  })
  @ApiBody({
    description: 'Form fields plus optional `images[]` binaries',
    schema: {
      type: 'object',
      required: ['title', 'category', 'description'],
      properties: {
        title: { type: 'string', example: 'Booth payment callback is failing' },
        category: { type: 'string', example: 'payments' },
        description: { type: 'string', example: 'After checkout...' },
        images: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Ticket created' })
  create(@Req() req: AuthedReq, @Body() dto: CreateSupportTicketDto) {
    const files = req.files?.images ?? [];
    return this.supportTickets.createTicket(req.user, dto, { images: files });
  }

  @Get('my-tickets')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my support tickets' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 20 })
  @ApiOkResponse({ description: 'Ticket list' })
  listMyTickets(
    @Req() req: { user: AuthUser },
    @Query() query: ListSupportTicketsQueryDto,
  ) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    return this.supportTickets.listMyTickets(req.user.id, page, pageSize);
  }

  @Get('my-tickets/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a ticket I created' })
  @ApiParam({ name: 'id', example: 'clxyz123abc' })
  getMyTicket(
    @Req() req: { user: AuthUser },
    @Param('id') id: string,
  ) {
    return this.supportTickets.getMyTicket(req.user.id, id);
  }
}

