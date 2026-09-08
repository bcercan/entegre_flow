import { type ArgumentsHost, Catch, type ExceptionFilter } from "@nestjs/common";
import type { Response } from "express";
import { AppError } from "@entegreflow/core";

/** Maps typed AppError → its HTTP status + a stable JSON error shape. */
@Catch(AppError)
export class AppExceptionFilter implements ExceptionFilter {
  catch(err: AppError, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details ?? null },
    });
  }
}
