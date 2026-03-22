import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { globalValidationPipeOptions } from './validation-pipe-options';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  app.use(cookieParser());

  // Media (avatars, etc.) are served from Cloudinary URLs

  // Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('ANPMP Conference Portal API')
    .setDescription(
      'Backend API for the ANPMP Conference registration and management',
    )
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // CORS - allow origins from env or default to localhost
  const corsOrigins = process.env.CORS_ORIGINS?.split(',') ?? [
    'http://localhost:3000',
  ];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Global validation pipe for DTOs
  app.useGlobalPipes(new ValidationPipe(globalValidationPipeOptions));

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
