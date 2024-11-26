import { FileInfo } from '../../../types/workspace';

export class CreateWorkspaceRecordDto {
  filePath: string;
  etag: string;
  size: number;
  workspaceId: number;
}

export class UpdateWorkspaceRecordDto extends CreateWorkspaceRecordDto {}

export class WorkspaceRecordResponseDto {
  id: number;
  filePath: string;
  etag: string;
  size: number;
  workspace: {
    id: number;
    name: string;
  };
  modifier: {
    id: number;
    username: string;
  };
  createdAt: Date;
  updatedAt: Date;
  previewUrl: string | null;
}

export class WorkspaceFileTreeDto {
  records: FileInfo[];
} 