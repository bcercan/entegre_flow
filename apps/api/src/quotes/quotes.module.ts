import { Module } from "@nestjs/common";
import { SmtpSender } from "@entegreflow/mail";
import { APP_CONFIG, type AppConfig } from "@entegreflow/server";
import { AuthModule } from "../auth/auth.module";
import { SendService } from "./send.service";
import { SendController } from "./send.controller";
import { MAILBOX } from "./mail.tokens";

@Module({
  imports: [AuthModule],
  controllers: [SendController],
  providers: [
    SendService,
    {
      provide: MAILBOX,
      inject: [APP_CONFIG],
      // Phase 1: env SMTP (Mailpit in dev). Phase 1b: per-tenant encrypted mailbox.
      useFactory: (cfg: AppConfig) =>
        new SmtpSender({
          host: cfg.SMTP_HOST,
          port: cfg.SMTP_PORT,
          user: cfg.SMTP_USER,
          pass: cfg.SMTP_PASS,
          secure: cfg.SMTP_SECURE,
        }),
    },
  ],
})
export class QuotesModule {}
