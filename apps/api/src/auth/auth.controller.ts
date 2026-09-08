import { Body, Controller, Post } from "@nestjs/common";
import { loginInputSchema } from "@entegreflow/contracts";
import { ValidationError } from "@entegreflow/core";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("login")
  async login(@Body() body: unknown) {
    const parsed = loginInputSchema.safeParse(body);
    if (!parsed.success) throw ValidationError("Geçersiz giriş", parsed.error.issues);
    return this.auth.login(parsed.data.email, parsed.data.password);
  }
}
