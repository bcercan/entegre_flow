import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import type { TenantContext } from "@entegreflow/core";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantCtx } from "../auth/tenant.decorator";
import { ComposeService, type ComposeAttachment } from "./compose.service";

@Controller()
@UseGuards(JwtAuthGuard)
export class ComposeController {
  constructor(private readonly compose: ComposeService) {}

  /** Compose a brand-new outgoing email (lands in the Sent box). */
  @Post("compose")
  composeNew(
    @TenantCtx() ctx: TenantContext,
    @Body("to") to: string,
    @Body("subject") subject: string,
    @Body("text") text: string,
    @Body("html") html?: string,
    @Body("cc") cc?: string,
    @Body("bcc") bcc?: string,
    @Body("attachments") attachments?: ComposeAttachment[],
  ) {
    return this.compose.composeNew(to, subject, text, ctx, html, cc, bcc, attachments ?? []);
  }

  /** Save a compose as a draft (no send). */
  @Post("drafts")
  saveDraft(
    @TenantCtx() ctx: TenantContext,
    @Body("to") to: string,
    @Body("subject") subject: string,
    @Body("text") text: string,
    @Body("html") html?: string,
    @Body("cc") cc?: string,
    @Body("bcc") bcc?: string,
  ) {
    return this.compose.saveDraft(to, subject, text, ctx, html, cc, bcc);
  }

  /** Plain in-thread reply to a received message. */
  @Post("messages/:id/reply")
  reply(
    @TenantCtx() ctx: TenantContext,
    @Param("id") id: string,
    @Body("text") text: string,
    @Body("html") html?: string,
  ) {
    return this.compose.reply(id, text, ctx, html);
  }

  /** Forward a received message to another recipient. */
  @Post("messages/:id/forward")
  forward(
    @TenantCtx() ctx: TenantContext,
    @Param("id") id: string,
    @Body("to") to: string,
    @Body("text") text: string,
  ) {
    return this.compose.forward(id, to, text, ctx);
  }
}
