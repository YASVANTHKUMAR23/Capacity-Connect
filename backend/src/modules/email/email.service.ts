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

  async sendVerificationOtp(email: string, otp: string): Promise<void> {
    const from = this.configService.get<string>('smtp.from');

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from,
          to: email,
          subject: `${otp} is your Capacity Connect Verification Code (IMD)`,
          html: `
            <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; rounded: 12px; background-color: #ffffff;">
              <h2 style="color: #0f172a; margin-bottom: 8px;">Capacity Connect</h2>
              <p style="color: #64748b; font-size: 14px; margin-top: 0;">India Meteorological Department (IMD) | Ministry of Earth Sciences</p>
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="color: #334155; font-size: 15px;">Welcome to Capacity Connect. Please use the following 6-digit One-Time Password (OTP) to verify your official email address:</p>
              <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
                <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1e40af;">${otp}</span>
              </div>
              <p style="color: #475569; font-size: 14px;"><strong>Note:</strong> This verification code is valid for <strong>10 minutes</strong> and can only be used once.</p>
              <p style="color: #64748b; font-size: 13px;">After email verification, your account will undergo review and approval by an authorized administrator before you can sign in.</p>
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">If you did not request this verification code, please ignore this email or contact portal administration.</p>
            </div>
          `,
        });
      } catch (err) {
        this.logger.error('Failed to send verification OTP via SMTP:', err);
      }
    } else {
      this.logger.log(`[DEV EMAIL] Verification OTP for ${email}: ${otp} (valid for 10 minutes)`);
    }
  }

  async sendVerificationEmail(email: string, otp: string): Promise<void> {
    return this.sendVerificationOtp(email, otp);
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
