import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CaptchaService {
  private readonly logger = new Logger(CaptchaService.name);
  private readonly verifyEndpoint = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

  constructor(private readonly configService: ConfigService) {}

  async verify(token: string, remoteIp?: string): Promise<boolean> {
    const bypass = this.configService.get<boolean>('turnstile.bypassInDev', false);
    if (bypass) {
      this.logger.debug('Turnstile bypassed in development mode');
      return true;
    }

    // Cloudflare Turnstile testing keys (1x00000000000000000000AA always passes)
    if (!token) {
      return false;
    }

    const secretKey = this.configService.get<string>('turnstile.secretKey');
    if (!secretKey) {
      this.logger.warn('Turnstile secret key not configured; skipping CAPTCHA check');
      return true;
    }

    try {
      const formData = new URLSearchParams();
      formData.append('secret', secretKey);
      formData.append('response', token);
      if (remoteIp) {
        formData.append('remoteip', remoteIp);
      }

      const res = await fetch(this.verifyEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });

      if (!res.ok) {
        this.logger.error(`Turnstile verification request failed with status: ${res.status}`);
        return false;
      }

      const outcome = (await res.json()) as { success: boolean; 'error-codes'?: string[] };
      if (!outcome.success) {
        this.logger.warn(`Turnstile validation rejected token: ${JSON.stringify(outcome['error-codes'])}`);
      }
      return outcome.success;
    } catch (error) {
      this.logger.error('Error contacting Cloudflare Turnstile:', error);
      return false;
    }
  }
}
