import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/interfaces/auth.interface';
import { AdminAiService } from './services/admin-ai.service';
import { NvidiaAiService } from './services/nvidia-ai.service';

export class AdminChatDto {
  question: string;
  history?: Array<{ role: 'user' | 'assistant'; text: string }>;
}

@Controller('admin/ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminAiController {
  constructor(
    private readonly adminAiService: AdminAiService,
    private readonly nvidiaAi: NvidiaAiService,
  ) {}

  @Get('health')
  async getAiHealth() {
    return {
      status: 'ok',
      provider: 'NVIDIA NIM',
      model: 'moonshotai/kimi-k3.1-pro',
      configured: this.nvidiaAi.isConfigured(),
    };
  }

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async chat(@Body() body: AdminChatDto) {
    const question = body.question?.trim() || 'Overview of Capacity Connect';
    const history = body.history || [];

    const result = await this.adminAiService.processQuery(question, history);
    return {
      success: true,
      data: result,
    };
  }
}
