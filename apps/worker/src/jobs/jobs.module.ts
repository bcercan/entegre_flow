import { Module } from "@nestjs/common";
import { AnalyzeWorker } from "./analyze.worker";
import { MailboxSyncWorker } from "./mailbox-sync.worker";
import { MailboxScheduler } from "./mailbox-scheduler";

/**
 * Registers the BullMQ consumers (mailbox.sync + message.analyze) and the
 * scheduler that polls each mailbox on an interval.
 */
@Module({
  providers: [AnalyzeWorker, MailboxSyncWorker, MailboxScheduler],
})
export class JobsModule {}
