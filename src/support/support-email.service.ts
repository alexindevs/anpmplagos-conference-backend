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

  async sendPasswordResetEmail(input: {
    to: string;
    resetUrl: string;
  }): Promise<void> {
    if (!this.from) {
      this.logger.warn('SUPPORT_EMAIL_FROM missing; skipping password reset email.');
      return;
    }

    await this.mailer.sendMail({
      from: this.from,
      to: input.to,
      subject: 'Reset your password – ANPMP AGM/Scientific Conference',
      template: 'password-reset',
      context: {
        email: input.to,
        resetUrl: input.resetUrl,
      },
    });
  }

  async sendModeratorInviteEmail(input: {
    to: string;
    inviteUrl: string;
  }): Promise<void> {
    if (!this.from) {
      this.logger.warn('SUPPORT_EMAIL_FROM missing; skipping moderator invite email.');
      return;
    }

    await this.mailer.sendMail({
      from: this.from,
      to: input.to,
      subject: "You're invited to moderate attendance – ANPMP AGM/Scientific Conference",
      template: 'moderator-invite',
      context: {
        email: input.to,
        inviteUrl: input.inviteUrl,
      },
    });
  }

  async sendPaymentClaimedEmail(input: {
    to: string[];
    userName: string;
    userEmail: string;
    reference: string;
    paymentKind: string;
    baseAmountNgn: string;
    claimedAt: string;
  }): Promise<void> {
    if (!this.from) {
      this.logger.warn('SUPPORT_EMAIL_FROM missing; skipping payment claimed email.');
      return;
    }

    const recipients = input.to.filter(Boolean);
    if (!recipients.length) return;

    await this.mailer.sendMail({
      from: this.from,
      to: recipients.join(','),
      subject: 'Manual payment claimed – action required',
      template: 'payment-claimed',
      context: {
        userName: input.userName,
        userEmail: input.userEmail,
        reference: input.reference,
        paymentKind: input.paymentKind.replace(/_/g, ' '),
        baseAmountNgn: input.baseAmountNgn,
        claimedAt: new Date(input.claimedAt).toLocaleString('en-NG', {
          timeZone: 'Africa/Lagos',
          dateStyle: 'full',
          timeStyle: 'short',
        }),
      },
    });
  }
}
