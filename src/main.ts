import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 8965);
  console.log(`应用运行在 ${process.env.NODE_ENV} 环境`);
}
bootstrap();
