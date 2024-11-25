import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppDataSource } from './config/Database';
import { UserModule } from './modules/user/user.module';
import { WorkspaceModule } from './modules/workspace/workspace.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(AppDataSource),
    UserModule,
    WorkspaceModule,
  ],
})
export class AppModule {}
