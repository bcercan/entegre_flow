import { Controller, Param, Post, UseGuards } from "@nestjs/common";
import type { TenantContext } from "@entegreflow/core";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantCtx } from "../auth/tenant.decorator";
import { SendService } from "./send.service";

@Controller()
@UseGuards(JwtAuthGuard)
export class SendController {
  constructor(private readonly sendService: SendService) {}

  /** Approve & send the drafted quote reply for a message (HITL). */
  @Post("messages/:id/send")
  submit(@TenantCtx() ctx: TenantContext, @Param("id") id: string) {
    return this.sendService.send(id, ctx);
  }
}
