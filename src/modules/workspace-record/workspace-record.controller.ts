import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { WorkspaceRecordService } from './workspace-record.service';
import {
  CreateWorkspaceRecordDto,
  UpdateWorkspaceRecordDto,
  WorkspaceRecordResponseDto,
  WorkspaceFileTreeDto,
} from './dto/workspace-record.dto';
import { AuthGuard } from '../../guards/auth.guard';
import { Express } from 'express';

interface SyncFileInfo {
  id: number;
  path: string;
  name: string;
  size: number;
  etag: string;
}

@Controller('workspace-record')
@UseGuards(AuthGuard)
export class WorkspaceRecordController {
  constructor(private readonly workspaceRecordService: WorkspaceRecordService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Body() createDto: CreateWorkspaceRecordDto,
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<WorkspaceRecordResponseDto> {
    return this.workspaceRecordService.create(
      createDto,
      req.user.userId,
      file.buffer,
    );
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('file'))
  async update(
    @Param('id') id: number,
    @Body() updateDto: UpdateWorkspaceRecordDto,
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<WorkspaceRecordResponseDto> {
    return this.workspaceRecordService.update(
      id,
      updateDto,
      req.user.userId,
      file.buffer,
    );
  }

  @Get('tree/:workspaceId')
  async getFileTree(
    @Param('workspaceId') workspaceId: number,
  ): Promise<WorkspaceFileTreeDto> {
    const records = await this.workspaceRecordService.getFileTree(workspaceId);
    return { records };
  }

  @Get('list/:workspaceId')
  async getRecordsByWorkspace(
    @Param('workspaceId') workspaceId: number,
  ): Promise<{ records: WorkspaceRecordResponseDto[] }> {
    const records = await this.workspaceRecordService.getRecordsByWorkspace(workspaceId);
    return { records };
  }

  @Post('sync/:workspaceId/:env')
  async syncFiles(
    @Param('workspaceId') workspaceId: number,
    @Param('env') env: 'dev' | 'test' | 'prod',
    @Body() data: { files: SyncFileInfo[] }
  ) {
    console.log('需要同步的文件列表:', data.files);
    // 这里您可以实现 OSS 同步逻辑
    return { success: true };
  }
} 