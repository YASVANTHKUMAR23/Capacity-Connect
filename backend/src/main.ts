import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port', 3000);
  const frontendUrl = configService.get<string>('cors.origin', 'http://localhost:5173');

  // Cookies
  app.use(cookieParser());

  // CORS
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:3000', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  });

  // Global prefix v1
  app.setGlobalPrefix('api/v1');

  // Request Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger OpenAPI Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Capacity Connect - Authentication & Identity API')
    .setDescription('Module 01: Institutional Authentication Specification for India Meteorological Department (IMD)')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port, '0.0.0.0');
  console.log(`\n======================================================`);
  console.log(`🚀 Capacity Connect Backend running on: http://localhost:${port}/api/v1`);
  console.log(`📑 API Documentation (Swagger) on:      http://localhost:${port}/api/docs`);
  console.log(`======================================================\n`);
  logger.log(`Capacity Connect Backend running on http://localhost:${port}/api/v1`);
  logger.log(`API Documentation available on http://localhost:${port}/api/docs`);
}

bootstrap();
