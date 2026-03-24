import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class SupportEmailService {
  private readonly logger = new Logger(SupportEmailService.name);

  private readonly supportEmails: string[];
  private readonly from: string;

  constructor(
    private readonly config: ConfigService,
    private readonly mailer: MailerService,
  ) {
    this.from =
      this.config.get<string>('SUPPORT_EMAIL_FROM', '').trim() ||
      this.config.get<string>('SUPPORT_EMAIL', '').trim();

    const recipientsRaw = this.config.get<string>('SUPPORT_EMAILS', '');
    this.supportEmails = recipientsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  getSupportRecipients(): string[] {
    return this.supportEmails;
  }

  async sendTicketCreatedEmail(input: {
    to: string[];
    subject: string;
    context: Record<string, unknown>;
  }): Promise<void> {
    if (!this.from) {
      this.logger.warn('SUPPORT_EMAIL_FROM missing; skipping email send.');
      return;
    }

    const recipients = input.to.filter(Boolean);
    if (!recipients.length) return;

    await this.mailer.sendMail({
      from: this.from,
      to: recipients.join(','),
      subject: input.subject,
      template: 'ticket-created',
      context: input.context,
    });
  }

  async sendTicketAnsweredEmail(input: {
    to: string[];
    subject: string;
    context: Record<string, unknown>;
  }): Promise<void> {
    if (!this.from) {
      this.logger.warn('SUPPORT_EMAIL_FROM missing; skipping email send.');
      return;
    }

    const recipients = input.to.filter(Boolean);
    if (!recipients.length) return;

    await this.mailer.sendMail({
      from: this.from,
      to: recipients.join(','),
      subject: input.subject,
      template: 'ticket-answered',
      context: input.context,
    });
  }
}
