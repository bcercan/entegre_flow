import "reflect-metadata";
import { createServer } from "node:http";
import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";
import { APP_CONFIG, type AppConfig } from "@entegreflow/server";
import { WorkerModule } from "./worker.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule, { bufferLogs: true });
  const logger = app.get(Logger);
  app.useLogger(logger);
  app.enableShutdownHooks();

  const cfg = app.get<AppConfig>(APP_CONFIG);

  // Minimal health probe so Coolify/compose can monitor the worker process.
  const server = createServer((req, res) => {
    if (req.url === "/healthz") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  server.listen(cfg.WORKER_HEALTH_PORT, "0.0.0.0");

  const shutdown = (): void => {
    server.close();
    void app.close().then(() => process.exit(0));
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  logger.log(`Worker hazır — health probe :${cfg.WORKER_HEALTH_PORT}`);
}

void bootstrap();
