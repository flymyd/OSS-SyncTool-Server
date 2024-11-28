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
  Query,
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
import { SyncTask, SyncTaskStatus } from '../../entities/sync-task.entity';
import { SyncTaskRecord, SyncTaskRecordStatus } from '../../entities/sync-task-record.entity';
import { SyncTaskQueryDto, SyncTaskResponseDto, SyncTaskListResponseDto } from './dto/sync-task.dto';

interface SyncFileInfo {
  id: number;
  path: string;
  name: string;
  size: number;
  etag: string;
  modifiedTime?: string;
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
    @Body() data: { files: SyncFileInfo[] },
    @Request() req,
  ) {
    console.log('待同步的环境', env)
    console.log('需要同步的文件列表:', data.files);
    return this.workspaceRecordService.syncFiles(workspaceId, env, data.files, req.user.userId);
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

  @UseGuards(AuthGuard)
  @Get('sync-tasks')
  async getSyncTasks(@Query() query: SyncTaskQueryDto): Promise<SyncTaskListResponseDto> {
    return this.workspaceRecordService.getSyncTasks(query);
  }

  @UseGuards(AuthGuard)
  @Get('sync-task/:id')
  async getSyncTaskDetail(@Param('id') id: number): Promise<SyncTaskResponseDto> {
    return this.workspaceRecordService.getSyncTaskDetail(id);
  }

  @Get('sync-task/:id/export')
  async exportSyncTaskRecords(
    @Param('id') id: number,
    @Res() res: Response,
  ) {
    const records = await this.workspaceRecordService.getSyncTaskRecordsForExport(id);
    
    // 设置响应头
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=sync-task-${id}-records.csv`);
    
    // 写入 CSV 头
    res.write('\ufeff'); // 添加 BOM，解决中文乱码
    res.write('文件名,文件路径,文件大小(KB),MD5,修改时间,修改人,同步状态,错误信息\n');
    
    // 写入数据
    records.forEach(record => {
      const row = [
        record.fileName,
        record.filePath,
        (record.fileSize / 1024).toFixed(2),
        record.fileMd5,
        new Date(record.lastModified).toLocaleString(),
        record.modifier.username,
        record.status === SyncTaskRecordStatus.SUCCESS ? '成功' : '失败',
        record.errorMessage || '',
      ].map(field => `"${field}"`).join(',');
      
      res.write(row + '\n');
    });
    
    res.end();
  }

  @Get('download/:id')
  async downloadFile(
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

      if (!fs.existsSync(filePath)) {
        throw new NotFoundException('文件不存在');
      }

      // 设置响应头
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(path.basename(record.filePath))}`);

      // 创建文件流并发送
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

      fileStream.on('error', (error) => {
        console.error('文件读取错误:', error);
        if (!res.headersSent) {
          res.status(500).send('文件读取错误');
        }
      });
    } catch (error) {
      console.error('下载错误:', error);
      if (!res.headersSent) {
        res.status(500).send('下载失败');
      }
    }
  }
} 