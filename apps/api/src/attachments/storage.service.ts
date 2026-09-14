import { Inject, Injectable } from "@nestjs/common";
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { Readable } from "node:stream";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { APP_CONFIG, type AppConfig } from "@entegreflow/server";

/** S3-compatible object storage (MinIO in dev) for attachments / quote PDFs. */
@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  readonly bucket: string;

  constructor(@Inject(APP_CONFIG) cfg: AppConfig) {
    this.bucket = cfg.S3_BUCKET;
    this.s3 = new S3Client({
      endpoint: cfg.S3_ENDPOINT,
      region: cfg.S3_REGION,
      credentials: { accessKeyId: cfg.S3_ACCESS_KEY, secretAccessKey: cfg.S3_SECRET_KEY },
      forcePathStyle: cfg.S3_FORCE_PATH_STYLE,
    });
  }

  /** A short-lived download URL that forces a file save with the display name. */
  presignedGetUrl(key: string, filename: string, mime: string, ttlSeconds = 300): Promise<string> {
    return getSignedUrl(
      this.s3,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentDisposition: `attachment; filename="${filename.replace(/"/g, "")}"`,
        ResponseContentType: mime,
      }),
      { expiresIn: ttlSeconds },
    );
  }

  async putObject(key: string, body: Uint8Array | Buffer | string, mime: string): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: mime }),
    );
  }

  async getObject(key: string): Promise<Buffer> {
    const res = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const stream = res.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk as Uint8Array));
    return Buffer.concat(chunks);
  }

  async ensureBucket(): Promise<void> {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }
}
