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
  NotFoundException,
  Res,
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
import { Express, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';

interface SyncFileInfo {
  id: number;
  path: string;
  name: string;
  size: number;
  etag: string;
}

@Controller('workspace-record')
export class WorkspaceRecordController {
  constructor(private readonly workspaceRecordService: WorkspaceRecordService) {}

  @UseGuards(AuthGuard)
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

  @UseGuards(AuthGuard)
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

  @UseGuards(AuthGuard)
  @Get('tree/:workspaceId')
  async getFileTree(
    @Param('workspaceId') workspaceId: number,
  ): Promise<WorkspaceFileTreeDto> {
    const records = await this.workspaceRecordService.getFileTree(workspaceId);
    return { records };
  }

  @UseGuards(AuthGuard)
  @Get('list/:workspaceId')
  async getRecordsByWorkspace(
    @Param('workspaceId') workspaceId: number,
  ): Promise<{ records: WorkspaceRecordResponseDto[] }> {
    const records = await this.workspaceRecordService.getRecordsByWorkspace(workspaceId);
    return { records };
  }

  @UseGuards(AuthGuard)
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

  @Get('preview/:id')
  async getPreview(
    @Param('id') id: number,
    @Res() res: Response,
  ) {
    try {
      const record = await this.workspaceRecordService.findOne(id);
      if (!record) {
        throw new NotFoundException('文件不存在');
      }

      const workspaceDir = this.workspaceRecordService.getWorkspaceDir(record.workspaceId);
      const cleanFilePath = record.filePath.startsWith('/') ? record.filePath.slice(1) : record.filePath;
      const filePath = path.join(workspaceDir, cleanFilePath);

      console.log('预览文件路径:', filePath);

      if (!fs.existsSync(filePath)) {
        console.log('文件不存在:', filePath);
        throw new NotFoundException('文件不存在');
      }

      const mimeType = this.getMimeType(filePath);
      res.setHeader('Content-Type', mimeType);

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

      fileStream.on('error', (error) => {
        console.error('文件读取错误:', error);
        if (!res.headersSent) {
          res.status(500).send('文件读取错误');
        }
      });
    } catch (error) {
      console.error('预览错误:', error);
      if (!res.headersSent) {
        res.status(500).send('预览失败');
      }
    }
  }

  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.webp': 'image/webp',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
} 