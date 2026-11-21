import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('smtp.host');
    const port = this.configService.get<number>('smtp.port');
    const user = this.configService.get<string>('smtp.user');
    const pass = this.configService.get<string>('smtp.password');

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    } else {
      this.logger.warn('SMTP credentials not configured. Emails will be logged to console in dev mode.');
    }
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;
    const from = this.configService.get<string>('smtp.from');

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from,
          to: email,
          subject: 'Verify your Capacity Connect Account (IMD)',
          html: `
            <h2>Capacity Connect — Ministry of Earth Sciences (IMD)</h2>
            <p>Welcome! Please verify your official email address by clicking the link below:</p>
            <p><a href="${verificationUrl}">${verificationUrl}</a></p>
            <p>This verification link is valid for 30 minutes. Once verified, your account will undergo administrator approval.</p>
          `,
        });
      } catch (err) {
        this.logger.error('Failed to send verification email via SMTP:', err);
      }
    } else {
      this.logger.log(`[DEV EMAIL] Verification email to ${email}. Token: ${token} | URL: ${verificationUrl}`);
    }
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
    const from = this.configService.get<string>('smtp.from');

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from,
          to: email,
          subject: 'Reset your Capacity Connect Password (IMD)',
          html: `
            <h2>Capacity Connect — Ministry of Earth Sciences (IMD)</h2>
            <p>A password reset request was received for your account.</p>
            <p><a href="${resetUrl}">Click here to reset your password</a></p>
            <p>This reset link expires in 15 minutes. If you did not request this, please disregard this email.</p>
          `,
        });
      } catch (err) {
        this.logger.error('Failed to send password reset email via SMTP:', err);
      }
    } else {
      this.logger.log(`[DEV EMAIL] Password reset email to ${email}. Token: ${token} | URL: ${resetUrl}`);
    }
  }
}
