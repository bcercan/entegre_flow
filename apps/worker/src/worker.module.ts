import { Module } from "@nestjs/common";
import { LoggerModule } from "nestjs-pino";
import { ConfigModule, DatabaseModule, RedisModule } from "@entegreflow/server";
import { JobsModule } from "./jobs/jobs.module";

/**
 * The worker boots the SAME infrastructure modules as the api (config, db,
 * redis). Phase 1 adds JobsModule (BullMQ processors: mailbox.sync,
 * message.analyze, erp.*.sync, quote.send).
 */
@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: { level: process.env.LOG_LEVEL ?? "info", autoLogging: false },
    }),
    ConfigModule,
    DatabaseModule,
    RedisModule,
    JobsModule,
  ],
})
export class WorkerModule {}
