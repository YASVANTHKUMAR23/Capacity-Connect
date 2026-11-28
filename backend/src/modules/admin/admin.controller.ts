import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/interfaces/auth.interface';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // 1. Announcements
  @Get('announcements')
  async getAnnouncements() {
    return { success: true, data: await this.adminService.getAnnouncements() };
  }

  @Post('announcements')
  async createAnnouncement(@CurrentUser('userId') authorId: string, @Body() data: any) {
    return { success: true, data: await this.adminService.createAnnouncement(authorId, data) };
  }

  @Patch('announcements/:id')
  async updateAnnouncement(@Param('id') id: string, @Body() data: any) {
    return { success: true, data: await this.adminService.updateAnnouncement(id, data) };
  }

  @Delete('announcements/:id')
  async deleteAnnouncement(@Param('id') id: string) {
    return await this.adminService.deleteAnnouncement(id);
  }

  // 2. User Governance & Approvals
  @Get('users/pending')
  async getPendingApprovals() {
    return { success: true, data: await this.adminService.getPendingApprovals() };
  }

  @Get('users/rejected')
  async getRejectedUsers() {
    return { success: true, data: await this.adminService.getRejectedUsers() };
  }

  @Get('users/directory')
  async getUserDirectory() {
    return { success: true, data: await this.adminService.getUserDirectory() };
  }

  @Patch('users/:id/approve')
  async approveUser(@CurrentUser('userId') adminId: string, @Param('id') id: string) {
    return await this.adminService.approveUser(adminId, id);
  }

  @Patch('users/:id/reject')
  async rejectUser(
    @CurrentUser('userId') adminId: string,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return await this.adminService.rejectUser(adminId, id, reason);
  }

  @Patch('users/:id/role')
  async updateUserRole(
    @CurrentUser('userId') adminId: string,
    @Param('id') id: string,
    @Body('role') role: string,
  ) {
    return await this.adminService.updateUserRole(adminId, id, role);
  }

  // 3. Courses Management
  @Get('courses')
  async getCourses() {
    return { success: true, data: await this.adminService.getCourses() };
  }

  @Post('courses')
  async createCourse(@CurrentUser('userId') authorId: string, @Body() data: any) {
    return await this.adminService.createCourse(authorId, data);
  }

  @Patch('courses/:id')
  async updateCourse(@Param('id') id: string, @Body() data: any) {
    return await this.adminService.updateCourse(id, data);
  }

  @Delete('courses/:id')
  async deleteCourse(@Param('id') id: string) {
    return await this.adminService.deleteCourse(id);
  }

  // 4. Trainers & Trainees Rosters
  @Get('trainers')
  async getTrainers() {
    return { success: true, data: await this.adminService.getTrainers() };
  }

  @Patch('trainers/:id')
  async updateTrainer(@Param('id') id: string, @Body() data: any) {
    return await this.adminService.updateTrainer(id, data);
  }

  @Get('trainees')
  async getTrainees() {
    return { success: true, data: await this.adminService.getTrainees() };
  }

  @Patch('trainees/:id')
  async updateTrainee(@Param('id') id: string, @Body() data: any) {
    return await this.adminService.updateTrainee(id, data);
  }

  // 5. Competencies
  @Get('competencies')
  async getCompetencies() {
    return { success: true, data: await this.adminService.getCompetencies() };
  }

  @Post('competencies')
  async createCompetency(@Body() data: any) {
    return await this.adminService.createCompetency(data);
  }

  @Patch('competencies/:id')
  async updateCompetency(@Param('id') id: string, @Body() data: any) {
    return await this.adminService.updateCompetency(id, data);
  }

  @Delete('competencies/:id')
  async deleteCompetency(@Param('id') id: string) {
    return await this.adminService.deleteCompetency(id);
  }

  // 5b. Divisions
  @Post('divisions')
  async createDivision(@Body() data: any) {
    return await this.adminService.createDivision(data);
  }

  // 6. Settings
  @Get('settings')
  async getSettings() {
    return { success: true, data: await this.adminService.getSettings() };
  }

  @Patch('settings')
  async updateSettings(@Body() data: any) {
    return await this.adminService.updateSettings(data);
  }

  // 7. Dashboard & Analytics Aggregates
  @Get('dashboard/metrics')
  async getDashboardData() {
    return { success: true, data: await this.adminService.getDashboardData() };
  }

  // 8. Analytics Dedicated Endpoints
  @Get('analytics/overview')
  async getAnalyticsOverview() {
    return { success: true, data: await this.adminService.getAnalyticsOverview() };
  }

  @Get('analytics/enrollments')
  async getAnalyticsEnrollments() {
    return { success: true, data: await this.adminService.getAnalyticsEnrollments() };
  }

  @Get('analytics/assessments')
  async getAnalyticsAssessments() {
    return { success: true, data: await this.adminService.getAnalyticsAssessments() };
  }

  @Get('analytics/participation')
  async getAnalyticsParticipation() {
    return { success: true, data: await this.adminService.getAnalyticsParticipation() };
  }
}
