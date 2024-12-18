import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceRecordController } from './workspace-record.controller';
import { WorkspaceRecordService } from './workspace-record.service';
import { WorkspaceRecord } from '../../entities/workspace-record.entity';
import { Workspace } from '../../entities/workspace.entity';
import { User } from '../../entities/user.entity';
import { SyncTask } from '../../entities/sync-task.entity';
import { SyncTaskRecord } from '../../entities/sync-task-record.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkspaceRecord,
      Workspace,
      User,
      SyncTask,
      SyncTaskRecord,
    ]),
  ],
  controllers: [WorkspaceRecordController],
  providers: [WorkspaceRecordService],
})
export class WorkspaceRecordModule {} 