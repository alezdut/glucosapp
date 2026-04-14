import "reflect-metadata";
import { ValidationPipe, VersioningType, Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { assertBackendRuntimeEnv, loadBackendRuntimeEnv } from "./config/runtime-env";

async function bootstrap() {
  const runtimeEnv = loadBackendRuntimeEnv();
  assertBackendRuntimeEnv(runtimeEnv);
  const app = await NestFactory.create(AppModule);
  const logger = new Logger("Bootstrap");
  const isProduction = runtimeEnv.NODE_ENV === "production";
  app.enableCors({
    origin: runtimeEnv.ALLOWED_ORIGINS.length > 0 ? runtimeEnv.ALLOWED_ORIGINS : !isProduction,
    credentials: true,
  });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  const config = new DocumentBuilder()
    .setTitle("Glucosapp API")
    .setDescription("API for Glucosapp")
    .setVersion("1.0.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);

  await app.listen(runtimeEnv.PORT, "0.0.0.0");
  logger.log(`API running on http://0.0.0.0:${runtimeEnv.PORT}/v1 (docs: /docs)`);
}
bootstrap();
