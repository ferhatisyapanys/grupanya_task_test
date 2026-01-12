import 'reflect-metadata';
import * as path from 'path';
import * as dotenv from 'dotenv';
// Load only app-specific .env to avoid root overrides on DATABASE_URL
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app.module';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter';
import { ValidationPipe } from '@nestjs/common';
import { RequestLoggerInterceptor } from './common/interceptors/logger.interceptor';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const defaultOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000']
  const raw = (process.env.CORS_ORIGINS || '').trim()
  const corsOrigins = raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : []
  // If CORS_ORIGINS = '*', allow all origins (useful for public demo)
  const origin: any = raw === '*'
    ? true
    : (corsOrigins.length ? corsOrigins : defaultOrigins)
  app.enableCors({ origin, credentials: true });
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new GlobalHttpExceptionFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalInterceptors(new RequestLoggerInterceptor());

  // Swagger/OpenAPI
  const config = new DocumentBuilder()
    .setTitle('Grupanya Task Management API')
    .setDescription('Internal API for Leads, Accounts, Tasks, Reports')
    .setVersion('0.1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Reserved for future real auth' }, 'bearer')
    .addServer('http://localhost:3001')
    .build();
  const document = SwaggerModule.createDocument(app as any, config);
  SwaggerModule.setup('api/docs', app as any, document);
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3001);
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${process.env.PORT ?? 3001}`);
}

bootstrap();
