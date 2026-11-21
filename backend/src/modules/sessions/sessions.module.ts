import { Module, forwardRef } from '@nestjs/common';
import { SessionService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [forwardRef(() => AuthModule), AuditModule],
  controllers: [SessionsController],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionsModule {}
