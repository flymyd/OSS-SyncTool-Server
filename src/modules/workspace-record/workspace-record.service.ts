import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { WorkspaceRecord } from '../../entities/workspace-record.entity';
import { User } from '../../entities/user.entity';
import { Workspace } from '../../entities/workspace.entity';
import {
  CreateWorkspaceRecordDto,
  UpdateWorkspaceRecordDto,
  WorkspaceRecordResponseDto,
} from './dto/workspace-record.dto';
import { FileInfo } from '../../types/workspace';

@Injectable()
export class WorkspaceRecordService {
  private readonly baseDir: string;

  constructor(
    @InjectRepository(WorkspaceRecord)
    private workspaceRecordRepository: Repository<WorkspaceRecord>,
    @InjectRepository(Workspace)
    private workspaceRepository: Repository<Workspace>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    // 根据环境设置基础目录
    if (process.env.NODE_ENV === 'development') {
      this.baseDir = path.join(require('os').tmpdir(), 'workspace-files');
    } else {
      this.baseDir = process.env.WORKSPACE_BASE_DIR || 'workspace-files';
    }

    // 确保基础目录存在
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private getWorkspaceDir(workspaceId: number): string {
    return path.join(this.baseDir, workspaceId.toString());
  }

  private async ensureWorkspaceDir(workspaceId: number): Promise<void> {
    const dir = this.getWorkspaceDir(workspaceId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private async writeFile(workspaceId: number, filePath: string, content: Buffer): Promise<void> {
    const fullPath = path.join(this.getWorkspaceDir(workspaceId), filePath);
    const dir = path.dirname(fullPath);
    
    // 确保目录存在
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // 写入文件
    await fs.promises.writeFile(fullPath, content);
  }

  async create(
    createDto: CreateWorkspaceRecordDto,
    userId: number,
    fileContent: Buffer,
  ): Promise<WorkspaceRecordResponseDto> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: createDto.workspaceId },
      relations: ['creator'],
    });
    
    if (!workspace) {
      throw new NotFoundException('工作区不存在');
    }

    const modifier = await this.userRepository.findOne({
      where: { id: userId },
    });

    // 查找是否存在相同路径的记录
    const existingRecord = await this.workspaceRecordRepository.findOne({
      where: {
        workspace: { id: createDto.workspaceId },
        filePath: createDto.filePath,
      },
      relations: ['workspace', 'modifier'],
    });

    // 确保工作区目录存在
    await this.ensureWorkspaceDir(workspace.id);
    
    // 写入文件
    await this.writeFile(workspace.id, createDto.filePath, fileContent);

    if (existingRecord) {
      // 如果存在记录，则更新
      Object.assign(existingRecord, {
        etag: createDto.etag,
        size: createDto.size,
        modifier,
      });
      
      // 手动更新时间戳
      existingRecord.updatedAt = new Date();
      
      const updatedRecord = await this.workspaceRecordRepository.save(existingRecord);
      return this.transformToDto(updatedRecord);
    } else {
      // 如果不存在记录，则创建新记录
      const record = this.workspaceRecordRepository.create({
        ...createDto,
        workspace,
        modifier,
      });
      const savedRecord = await this.workspaceRecordRepository.save(record);
      return this.transformToDto(savedRecord);
    }
  }

  async update(
    id: number,
    updateDto: UpdateWorkspaceRecordDto,
    userId: number,
    fileContent: Buffer,
  ): Promise<WorkspaceRecordResponseDto> {
    const record = await this.workspaceRecordRepository.findOne({
      where: { id },
      relations: ['workspace', 'modifier'],
    });

    if (!record) {
      throw new NotFoundException('记录不存在');
    }

    const modifier = await this.userRepository.findOne({
      where: { id: userId },
    });

    await this.writeFile(record.workspace.id, updateDto.filePath, fileContent);

    Object.assign(record, updateDto, { modifier });
    const updatedRecord = await this.workspaceRecordRepository.save(record);
    return this.transformToDto(updatedRecord);
  }

  async getFileTree(workspaceId: number): Promise<FileInfo[]> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException(`工作区 ${workspaceId} 不存在`);
    }

    const records = await this.workspaceRecordRepository.find({
      where: { workspace: { id: workspaceId } },
      relations: ['modifier'],
    });

    // 如果没有记录，返回空数组
    if (!records.length) {
      return [];
    }

    const fileTree: FileInfo[] = [];
    const dirMap = new Map<string, FileInfo>();

    records.forEach(record => {
      const pathParts = record.filePath.split('/').filter(Boolean);
      let currentPath = '';
      
      // 处理目录
      pathParts.slice(0, -1).forEach(part => {
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        if (!dirMap.has(currentPath)) {
          const dirInfo: FileInfo = {
            name: part,
            path: `/${currentPath}`,
            size: 0,
            modifiedTime: record.updatedAt.toISOString(),
            etag: `dir-${currentPath}`,
            isDirectory: true,
            children: [],
          };
          
          dirMap.set(currentPath, dirInfo);
          
          if (parentPath) {
            dirMap.get(parentPath)?.children?.push(dirInfo);
          } else {
            fileTree.push(dirInfo);
          }
        }
      });

      // 处理文件
      const fileName = pathParts[pathParts.length - 1];
      const fileInfo: FileInfo = {
        name: fileName,
        path: `/${record.filePath}`,
        size: record.size,
        modifiedTime: record.updatedAt.toISOString(),
        etag: record.etag,
        isDirectory: false,
      };

      if (pathParts.length > 1) {
        const parentPath = pathParts.slice(0, -1).join('/');
        dirMap.get(parentPath)?.children?.push(fileInfo);
      } else {
        fileTree.push(fileInfo);
      }
    });

    return fileTree;
  }

  private transformToDto(record: WorkspaceRecord): WorkspaceRecordResponseDto {
    return {
      id: record.id,
      filePath: record.filePath,
      etag: record.etag,
      size: record.size,
      workspace: {
        id: record.workspace.id,
        name: record.workspace.name,
      },
      modifier: {
        id: record.modifier.id,
        username: record.modifier.username,
      },
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async getRecordsByWorkspace(workspaceId: number): Promise<WorkspaceRecordResponseDto[]> {
    const records = await this.workspaceRecordRepository.find({
      where: { workspace: { id: workspaceId } },
      relations: ['workspace', 'modifier'],
      order: { createdAt: 'DESC' },
    });

    return records.map(record => this.transformToDto(record));
  }
} 