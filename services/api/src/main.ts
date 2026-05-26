import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const uploadRoot = join(process.cwd(), 'uploads');
  if (!existsSync(uploadRoot)) mkdirSync(uploadRoot, { recursive: true });

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(uploadRoot, { prefix: '/uploads' });

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  const corsOrigins = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()).filter(Boolean);
  app.enableCors({
    origin: corsOrigins?.length ? corsOrigins : true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.setGlobalPrefix('api/v1');

  const config = new DocumentBuilder()
    .setTitle('SalonePlate API')
    .setDescription('Premium food delivery marketplace API for Sierra Leone')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`SalonePlate API running on http://localhost:${port} (LAN: use your Wi‑Fi IPv4 from ipconfig)`);
  console.log(`API docs: http://localhost:${port}/api/docs`);
}

bootstrap();
