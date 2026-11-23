import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditEventType } from '../../common/interfaces/auth.interface';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async logEvent(params: {
    userId?: string | null;
    eventType: AuditEventType;
    ipAddress?: string;
    userAgent?: string;
    metadata?: any;
  }): Promise<void> {
    try {
      this.logger.log(`[AUDIT] Event: ${params.eventType} | User: ${params.userId || 'Anonymous'} | IP: ${params.ipAddress || 'Unknown'}`);
      await this.prisma.auditLog.create({
        data: {
          userId: params.userId || null,
          eventType: params.eventType as any,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
          metadata: params.metadata || {},
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to write audit log [${params.eventType}]: ${err.message}`);
    }
  }
}
