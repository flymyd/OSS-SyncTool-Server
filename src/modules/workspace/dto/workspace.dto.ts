export class CreateWorkspaceDto {
  name: string;
}

export class WorkspaceResponseDto {
  id: number;
  name: string;
  creator: {
    id: number;
    username: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
