import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminService } from './admin.service';
import { ModerateVideoDto } from './dto/moderate-video.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/enums';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get admin dashboard stats' })
  getStats() {
    return this.adminService.getStats();
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get videos pending review' })
  getPendingVideos() {
    return this.adminService.getPendingVideos();
  }

  @Patch('videos/:id/moderate')
  @ApiOperation({ summary: 'Approve or reject a pending video' })
  moderateVideo(
    @Param('id') id: string,
    @Body() dto: ModerateVideoDto,
    @Req() req: Request,
  ) {
    return this.adminService.moderateVideo(id, dto, req);
  }

  @Get('audit-log')
  @ApiOperation({ summary: 'Get audit log entries' })
  getAuditLog() {
    return this.adminService.getAuditLog();
  }
}
