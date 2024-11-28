import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config } from 'dotenv';
import * as compression from 'compression';
import helmet from 'helmet';


config(); // 在应用启动时加载环境变量

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const isDevelopment = process.env.NODE_ENV === 'development';
  app.use(compression());
  app.use(helmet());
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Disposition'],
  });

  const port = process.env.PORT || 8965;
  await app.listen(port);
  console.log(`应用运行在 ${process.env.NODE_ENV} 环境`);
  console.log(`服务器运行在: http://localhost:${port}`);
}
bootstrap();
