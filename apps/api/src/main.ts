import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { Logger } from "nestjs-pino";
import { APP_CONFIG, type AppConfig } from "@entegreflow/server";
import { AppModule } from "./app.module";
import { AppExceptionFilter } from "./common/app-exception.filter";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  // Baseline security headers. The API is consumed cross-origin by the web app
  // (app. → api.), so CORP must be cross-origin — the default `same-origin`
  // blocks the browser from reading responses even with valid CORS. Strict CSP
  // is enforced on the web app (the HTML host), not the JSON API.
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.useGlobalFilters(new AppExceptionFilter());

  const cfg = app.get<AppConfig>(APP_CONFIG);
  app.enableCors({
    origin: cfg.WEB_ORIGIN.split(",").map((o) => o.trim()),
    credentials: true,
  });

  app.enableShutdownHooks();
  await app.listen(cfg.API_PORT, "0.0.0.0");
}

void bootstrap();
