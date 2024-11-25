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
} 