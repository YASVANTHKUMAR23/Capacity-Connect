import { Controller, Get, Delete, Param, UseGuards, Req } from '@nestjs/common';
import { SessionService } from './sessions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('auth/sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(private readonly sessionService: SessionService) {}

  @Get()
  async getSessions(@CurrentUser('userId') userId: string) {
    const sessions = await this.sessionService.getUserSessions(userId);
    return {
      success: true,
      data: sessions,
    };
  }

  @Delete(':id')
  async revokeSession(@CurrentUser('userId') userId: string, @Param('id') sessionId: string) {
    await this.sessionService.revokeSessionById(userId, sessionId);
    return {
      success: true,
      message: 'Session revoked successfully',
    };
  }
}
