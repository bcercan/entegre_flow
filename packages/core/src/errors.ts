/** Typed application errors with stable codes (mapped to HTTP at the edge). */

export type AppErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "TENANT_CONTEXT_MISSING"
  | "INTEGRATION_UNAVAILABLE"
  | "BUDGET_EXCEEDED"
  | "EGRESS_BLOCKED"
  | "INTERNAL";

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: AppErrorCode, message: string, status: number, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const Unauthenticated = (m = "Kimlik doğrulanmadı") =>
  new AppError("UNAUTHENTICATED", m, 401);
export const Forbidden = (m = "Yetkiniz yok") => new AppError("FORBIDDEN", m, 403);
export const NotFound = (m = "Bulunamadı") => new AppError("NOT_FOUND", m, 404);
export const ValidationError = (m = "Geçersiz veri", details?: unknown) =>
  new AppError("VALIDATION", m, 422, details);
export const Conflict = (m = "Çakışma") => new AppError("CONFLICT", m, 409);
export const RateLimited = (m = "Çok fazla istek") => new AppError("RATE_LIMITED", m, 429);
export const TenantContextMissing = (m = "Tenant bağlamı yok") =>
  new AppError("TENANT_CONTEXT_MISSING", m, 500);
export const IntegrationUnavailable = (m = "Entegrasyon kullanılamıyor") =>
  new AppError("INTEGRATION_UNAVAILABLE", m, 503);
export const BudgetExceeded = (m = "AI bütçesi aşıldı") =>
  new AppError("BUDGET_EXCEEDED", m, 429);
export const EgressBlocked = (m = "Hedef adrese erişim engellendi") =>
  new AppError("EGRESS_BLOCKED", m, 502);
