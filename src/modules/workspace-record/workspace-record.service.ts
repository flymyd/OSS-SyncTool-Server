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
import { SyncTask, SyncTaskStatus } from '../../entities/sync-task.entity';
import { SyncTaskRecord, SyncTaskRecordStatus } from '../../entities/sync-task-record.entity';

// 在文件顶部添加接口定义
interface SyncFileInfo {
  id: number;
  path: string;
  name: string;
  size: number;
  etag: string;
  modifiedTime?: string;
}

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
    @InjectRepository(SyncTask)
    private syncTaskRepository: Repository<SyncTask>,
    @InjectRepository(SyncTaskRecord)
    private syncTaskRecordRepository: Repository<SyncTaskRecord>,
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

  public getWorkspaceDir(workspaceId: number): string {
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
    
    // 设置文件权限确保可读
    await fs.promises.chmod(fullPath, 0o644);
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
      
      // 动更新时间戳
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
      throw new NotFoundException(`工作区不存在或已被删除`);
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

    let dirIdCounter = -1; // 为目录生成负数ID，避免与文件ID冲突
    
    records.forEach(record => {
      const pathParts = record.filePath.split('/').filter(Boolean);
      let currentPath = '';
      
      // 处理目录
      pathParts.slice(0, -1).forEach(part => {
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        if (!dirMap.has(currentPath)) {
          const dirInfo: FileInfo = {
            id: dirIdCounter--,  // 使用递减的负数作为目录的ID
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
        id: record.id,
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

  private isImageFile(fileName: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    const ext = path.extname(fileName).toLowerCase();
    return imageExtensions.includes(ext);
  }

  private transformToDto(record: WorkspaceRecord): WorkspaceRecordResponseDto {
    const isImage = this.isImageFile(record.filePath);
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
      previewUrl: isImage ? `/api/workspace-record/preview/${record.id}` : null,
    };
  }

  async getRecordsByWorkspace(workspaceId: number): Promise<WorkspaceRecordResponseDto[]> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException(`工作区不存在或已被删除`);
    }

    const records = await this.workspaceRecordRepository.find({
      where: { workspace: { id: workspaceId } },
      relations: ['workspace', 'modifier'],
      order: { createdAt: 'DESC' },
    });

    return records.map(record => this.transformToDto(record));
  }

  async findOne(id: number): Promise<WorkspaceRecord | null> {
    return this.workspaceRecordRepository.findOne({
      where: { id },
      relations: ['workspace'],
    });
  }

  async syncFiles(
    workspaceId: number,
    env: 'dev' | 'test' | 'prod',
    files: SyncFileInfo[],
    userId: number,
  ): Promise<SyncTask> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });
    
    if (!workspace) {
      throw new NotFoundException('工作区不存在');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    // 创建同步任务
    const syncTask = this.syncTaskRepository.create({
      workspaceId: workspace.id,
      creatorId: user.id,
      targetEnv: env,
      totalFiles: files.length,
      failedFiles: 0,
      status: SyncTaskStatus.SUCCESS,
    });

    await this.syncTaskRepository.save(syncTask);

    // 处理每个文件
    for (const file of files) {
      const syncTaskRecord = this.syncTaskRecordRepository.create({
        syncTaskId: syncTask.id,
        filePath: file.path,
        fileName: file.name,
        fileSize: file.size,
        fileMd5: file.etag,
        lastModified: file.modifiedTime ? new Date(file.modifiedTime) : new Date(),
        modifierId: user.id,
        status: SyncTaskRecordStatus.SUCCESS,
      });

      try {
        // TODO: 这里实现实际的OSS上传逻辑
        // await this.uploadToOSS(file, env);
        
        await this.syncTaskRecordRepository.save(syncTaskRecord);
      } catch (error) {
        syncTaskRecord.status = SyncTaskRecordStatus.FAILED;
        syncTaskRecord.errorMessage = error.message;
        await this.syncTaskRecordRepository.save(syncTaskRecord);
        
        // 更新主任务的失败计数
        syncTask.failedFiles += 1;
        if (syncTask.failedFiles === syncTask.totalFiles) {
          syncTask.status = SyncTaskStatus.FAILED;
        } else {
          syncTask.status = SyncTaskStatus.PARTIAL_SUCCESS;
        }
        await this.syncTaskRepository.save(syncTask);
      }
    }

    return syncTask;
  }
} 