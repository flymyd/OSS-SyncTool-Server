import { SyncTaskStatus } from '../../../entities/sync-task.entity';
import { SyncTaskRecordStatus } from '../../../entities/sync-task-record.entity';

export class SyncTaskQueryDto {
  page: number;
  pageSize: number;
  workspaceName?: string;
  fileName?: string;
  filePath?: string;
  modifierName?: string;
  startTime?: Date;
  endTime?: Date;
  status?: SyncTaskStatus;
}

export class SyncTaskResponseDto {
  id: number;
  workspace: {
    id: number;
    name: string;
  };
  creator: {
    id: number;
    username: string;
  };
  targetEnv: string;
  status: SyncTaskStatus;
  totalFiles: number;
  failedFiles: number;
  createdAt: Date;
  updatedAt: Date;
  records: SyncTaskRecordResponseDto[];
}

export class SyncTaskRecordResponseDto {
  id: number;
  filePath: string;
  fileName: string;
  fileSize: number;
  fileMd5: string;
  lastModified: Date;
  modifier: {
    id: number;
    username: string;
  };
  status: SyncTaskRecordStatus;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class SyncTaskListResponseDto {
  total: number;
  items: SyncTaskResponseDto[];
} 