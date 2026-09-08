import { Module } from "@nestjs/common";
import { JwtService } from "./jwt.service";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { AuthController } from "./auth.controller";

@Module({
  controllers: [AuthController],
  providers: [JwtService, AuthService, JwtAuthGuard],
  exports: [JwtService, JwtAuthGuard],
})
export class AuthModule {}
