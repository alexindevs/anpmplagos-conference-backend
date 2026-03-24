import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import type { AuthUser } from '../auth/auth.service';
import { ListSupportTicketsQueryDto, RespondSupportTicketDto } from './dto';
import { SupportTicketService } from './support-ticket.service';

@ApiTags('Admin - Support Tickets')
@Controller('api/admin/support')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminSupportTicketController {
  constructor(private readonly supportTickets: SupportTicketService) {}

  @Get('tickets')
  @ApiOperation({ summary: 'List all support tickets (admin)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 20 })
  async listTickets(
    @Req() req: { user: AuthUser },
    @Query() query: ListSupportTicketsQueryDto,
  ) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    return this.supportTickets.listAdminTickets(page, pageSize);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Get ticket detail (admin)' })
  @ApiParam({ name: 'id', example: 'clxyz123abc' })
  async getTicket(@Param('id') id: string) {
    return this.supportTickets.getAdminTicket(id);
  }

  @Post('tickets/:id/respond')
  @ApiOperation({ summary: 'Respond to a support ticket (admin) and email the user' })
  @ApiParam({ name: 'id', example: 'clxyz123abc' })
  @ApiBody({ type: RespondSupportTicketDto })
  @ApiResponse({ status: 201, description: 'Response saved and user emailed' })
  async respondToTicket(
    @Req() req: { user: AuthUser },
    @Param('id') id: string,
    @Body() dto: RespondSupportTicketDto,
  ) {
    return this.supportTickets.respondToTicket(req.user, id, dto);
  }
}

