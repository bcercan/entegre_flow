import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AttachmentsController } from "./attachments.controller";
import { StorageService } from "./storage.service";

@Module({
  imports: [AuthModule],
  controllers: [AttachmentsController],
  providers: [StorageService],
  exports: [StorageService],
})
export class AttachmentsModule {}
