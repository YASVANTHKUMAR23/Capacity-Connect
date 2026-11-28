import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../../database/database.module';
import { NvidiaAiService } from './services/nvidia-ai.service';
import { AdminAiQueryService } from './services/admin-ai-query.service';
import { AdminAiService } from './services/admin-ai.service';
import { AdminAiController } from './admin-ai.controller';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [AdminAiController],
  providers: [NvidiaAiService, AdminAiQueryService, AdminAiService],
  exports: [AdminAiService, NvidiaAiService],
})
export class AdminAiModule {}
