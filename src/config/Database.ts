import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const AppDataSource: TypeOrmModuleOptions = {
  type: 'mysql',  //别的也行
  host: '127.0.0.1',
  port: 3306,
  username: 'root',
  password: 'root',
  database: 'osstool',
  synchronize: true,  //同步表结构
  logging: true,  //打印日志
  autoLoadEntities: true, //自动扫描实体
};