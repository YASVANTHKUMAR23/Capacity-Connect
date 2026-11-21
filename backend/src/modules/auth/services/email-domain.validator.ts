import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export function normalizeEmail(email: string): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

export function extractEmailDomain(email: string): string {
  const normalized = normalizeEmail(email);
  const atIndex = normalized.lastIndexOf('@');
  if (atIndex === -1 || atIndex === normalized.length - 1) {
    return '';
  }
  return normalized.substring(atIndex + 1);
}

@Injectable()
export class EmailDomainValidator {
  private readonly logger = new Logger(EmailDomainValidator.name);

  constructor(private readonly configService: ConfigService) {}

  isDomainAllowed(email: string): boolean {
    const domain = extractEmailDomain(email);
    if (!domain) {
      return false;
    }

    const allowedDomains: string[] = this.configService.get<string[]>('imd.allowedEmailDomains', [
      'imd.gov.in',
      'moes.gov.in',
    ]);

    const isAllowed = allowedDomains.includes(domain);
    if (!isAllowed) {
      this.logger.warn(`Rejected registration attempt for non-authorized domain '${domain}'`);
    }
    return isAllowed;
  }
}
