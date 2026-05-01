import { Logger, Module, forwardRef } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthModule } from '../auth/auth.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { SupportTicketController } from './support-ticket.controller';
import { AdminSupportTicketController } from './admin-support-ticket.controller';
import { SupportTicketService } from './support-ticket.service';
import { SupportEmailService } from './support-email.service';

const supportMailerLogger = new Logger('SupportMailer');

@Module({
  imports: [
    forwardRef(() => AuthModule),
    CloudinaryModule,
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const host = config.get<string>('SUPPORT_SMTP_HOST', '').trim();
        const portRaw = config.get<string>('SUPPORT_SMTP_PORT', '').trim();
        const user = config.get<string>('SUPPORT_SMTP_USER', '').trim();
        const pass = config.get<string>('SUPPORT_SMTP_PASS', '').trim();
        const port = portRaw ? Number(portRaw) : NaN;
        const hasSmtp =
          Boolean(host) &&
          Number.isFinite(port) &&
          port > 0 &&
          Boolean(user) &&
          Boolean(pass);
        const secure = port === 465;

        const templateDir = join(
          process.cwd(),
          'src',
          'support',
          'email-templates',
        );

        if (!hasSmtp) {
          supportMailerLogger.warn(
            'SUPPORT_SMTP_HOST/PORT/USER/PASS not all set — using stream transport (emails are not delivered). Set SMTP vars for real delivery.',
          );
        }

        return {
          transport: hasSmtp
            ? {
                host,
                port,
                // secure,
                auth: { user, pass },
              }
            : {
                streamTransport: true,
                newline: 'unix',
                buffer: true,
              },
          defaults: {
            from:
              config.get<string>('SUPPORT_EMAIL_FROM', '').trim() ||
              config.get<string>('SUPPORT_EMAIL', '').trim() ||
              'noreply@localhost',
          },
          template: {
            dir: templateDir,
            adapter: new HandlebarsAdapter(),
            options: {
              strict: true,
            },
          },
        };
      },
    }),
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  ],
  controllers: [SupportTicketController, AdminSupportTicketController],
  providers: [SupportTicketService, SupportEmailService],
  exports: [SupportTicketService, SupportEmailService],
})
export class SupportModule {}
