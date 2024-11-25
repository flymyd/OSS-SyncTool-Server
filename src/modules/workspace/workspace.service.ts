import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workspace } from '../../entities/workspace.entity';
import { User } from '../../entities/user.entity';
import { CreateWorkspaceDto, WorkspaceResponseDto } from './dto/workspace.dto';

@Injectable()
export class WorkspaceService {
  constructor(
    @InjectRepository(Workspace)
    private workspaceRepository: Repository<Workspace>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(
    createWorkspaceDto: CreateWorkspaceDto,
    userId: number,
  ): Promise<WorkspaceResponseDto> {
    const existingWorkspace = await this.workspaceRepository.findOne({
      where: { name: createWorkspaceDto.name },
    });

    if (existingWorkspace) {
      throw new ConflictException('工作区名称已存在');
    }

    const creator = await this.userRepository.findOne({
      where: { id: userId },
    });

    const workspace = this.workspaceRepository.create({
      ...createWorkspaceDto,
      creator,
    });

    const savedWorkspace = await this.workspaceRepository.save(workspace);
    return this.transformToDto(savedWorkspace);
  }

  async findAll(): Promise<WorkspaceResponseDto[]> {
    const workspaces = await this.workspaceRepository.find({
      relations: ['creator'],
    });
    return workspaces.map((workspace) => this.transformToDto(workspace));
  }

  private transformToDto(workspace: Workspace): WorkspaceResponseDto {
    return {
      id: workspace.id,
      name: workspace.name,
      creator: {
        id: workspace.creator.id,
        username: workspace.creator.username,
      },
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    };
  }

  async delete(id: number, userId: number): Promise<void> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id },
      relations: ['creator'],
    });

    if (!workspace) {
      throw new NotFoundException('工作区不存在');
    }

    if (workspace.creator.id !== userId) {
      throw new ForbiddenException('只有创建者可以删除工作区');
    }

    await this.workspaceRepository.remove(workspace);
  }
}
