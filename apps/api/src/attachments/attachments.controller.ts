import {
  Controller,
  Get,
  Inject,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { schema, type TenantAwareDb } from "@entegreflow/db";
import { NotFound, ValidationError, type TenantContext } from "@entegreflow/core";
import { TENANT_DB } from "@entegreflow/server";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantCtx } from "../auth/tenant.decorator";
import { StorageService } from "./storage.service";

/** Minimal shape of a multer memory-storage file (avoids an @types/multer dep). */
interface UploadFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

@Controller()
@UseGuards(JwtAuthGuard)
export class AttachmentsController {
  constructor(
    @Inject(TENANT_DB) private readonly tdb: TenantAwareDb,
    private readonly storage: StorageService,
  ) {}

  /** Stage a file in object storage; returns a ref the composer sends on submit. */
  @Post("uploads")
  @UseInterceptors(FileInterceptor("file"))
  async upload(@UploadedFile() file?: UploadFile) {
    if (!file) throw ValidationError("Dosya bulunamadı");
    if (file.size > 10 * 1024 * 1024) throw ValidationError("Dosya 10 MB sınırını aşıyor");
    const storageKey = `attachments/tmp/${randomUUID()}`;
    await this.storage.putObject(storageKey, file.buffer, file.mimetype || "application/octet-stream");
    return {
      storageKey,
      filename: file.originalname,
      mime: file.mimetype || "application/octet-stream",
      size: file.size,
    };
  }

  /** Attachments belonging to a message. */
  @Get("messages/:id/attachments")
  list(@TenantCtx() ctx: TenantContext, @Param("id") id: string) {
    return this.tdb.withTenant(ctx, (tx) =>
      tx
        .select({
          id: schema.attachments.id,
          filenameDisplay: schema.attachments.filenameDisplay,
          mime: schema.attachments.mime,
          sizeBytes: schema.attachments.sizeBytes,
        })
        .from(schema.attachments)
        .where(eq(schema.attachments.messageId, id)),
    );
  }

  /** A short-lived, tenant-checked download URL for one attachment. */
  @Get("attachments/:id/download-url")
  async downloadUrl(@TenantCtx() ctx: TenantContext, @Param("id") id: string) {
    const [att] = await this.tdb.withTenant(ctx, (tx) =>
      tx.select().from(schema.attachments).where(eq(schema.attachments.id, id)).limit(1),
    );
    if (!att) throw NotFound("Ek bulunamadı");
    const url = await this.storage.presignedGetUrl(att.storageKey, att.filenameDisplay, att.mime);
    return { url };
  }
}
