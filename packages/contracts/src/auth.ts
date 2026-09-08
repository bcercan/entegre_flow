import { z } from "zod";
import { roleSchema } from "./common";

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

/** Access token claims. `tid` = tenant id, `sid` = session/refresh family id. */
export const accessClaimsSchema = z.object({
  sub: z.string().uuid(),
  tid: z.string().uuid(),
  role: roleSchema,
  sid: z.string().uuid(),
});
export type AccessClaims = z.infer<typeof accessClaimsSchema>;

export const sessionUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string(),
  tenantId: z.string().uuid(),
  role: roleSchema,
});
export type SessionUser = z.infer<typeof sessionUserSchema>;

/** Actions that re-check role/membership against the DB (stale-claim defense). */
export const sensitiveActionSchema = z.enum([
  "quote.send",
  "order.create",
  "integration.write",
  "member.manage",
]);
export type SensitiveAction = z.infer<typeof sensitiveActionSchema>;
