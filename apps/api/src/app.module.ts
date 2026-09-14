import { Module } from "@nestjs/common";
import { LoggerModule } from "nestjs-pino";
import { ConfigModule, DatabaseModule, RedisModule } from "@entegreflow/server";
import { HealthModule } from "./health/health.module";
import { AuthModule } from "./auth/auth.module";
import { AnalysisModule } from "./analysis/analysis.module";
import { QuotesModule } from "./quotes/quotes.module";
import { AttachmentsModule } from "./attachments/attachments.module";

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? "info",
        autoLogging: true,
        // Redact secrets/bulk bodies (defense in depth alongside @entegreflow/core logger).
        redact: {
          paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            "*.password",
            "*.token",
            "*.apiKey",
            "*.secret",
            "*.ciphertext",
          ],
          censor: "[redacted]",
        },
      },
    }),
    ConfigModule,
    DatabaseModule,
    RedisModule,
    HealthModule,
    AuthModule,
    AnalysisModule,
    QuotesModule,
    AttachmentsModule,
  ],
})
export class AppModule {}
