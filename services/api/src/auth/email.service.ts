import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export type EmailDeliveryMode = 'smtp' | 'dev_console';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  onModuleInit() {
    const host = process.env.SMTP_HOST?.trim();
    if (!host) {
      this.logger.warn(
        'SMTP_HOST not set — verification codes will print to the API console in development',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    this.transporter
      .verify()
      .then(() => this.logger.log(`SMTP ready (${host})`))
      .catch((err) =>
        this.logger.error(
          `SMTP connection failed — check SMTP_HOST, SMTP_USER, SMTP_PASS. ${err?.message || err}`,
        ),
      );
  }

  isSmtpConfigured(): boolean {
    return Boolean(process.env.SMTP_HOST?.trim() && this.transporter);
  }

  async sendVerificationCode(email: string, code: string): Promise<EmailDeliveryMode> {
    const subject = 'Your SalonePlate verification code';
    const text = `Your SalonePlate verification code is: ${code}\n\nIt expires in 5 minutes. If you did not request this, ignore this email.`;
    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#071A2F;margin:0 0 8px">SalonePlate</h2>
        <p style="color:#444">Use this code to verify your email and complete sign up:</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#D4AF37;margin:16px 0">${code}</p>
        <p style="color:#666;font-size:14px">Expires in 5 minutes. Do not share this code.</p>
      </div>
    `;

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: process.env.SMTP_FROM || 'SalonePlate <noreply@saloneplate.sl>',
          to: email,
          subject,
          text,
          html,
        });
        this.logger.log(`Verification email sent to ${email}`);
        return 'smtp';
      } catch (err) {
        this.logger.error(`SMTP failed for ${email}`, err);
        if (process.env.NODE_ENV === 'production') {
          throw err;
        }
        this.logger.warn('Falling back to dev console OTP because SMTP failed');
      }
    }

    this.logger.warn(`[DEV EMAIL] To: ${email} | Code: ${code}`);
    console.log(`[DEV EMAIL OTP] ${email}: ${code}`);
    return 'dev_console';
  }
}
