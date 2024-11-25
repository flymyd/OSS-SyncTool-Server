import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { CreateWorkspaceDto, WorkspaceResponseDto } from './dto/workspace.dto';
import { AuthGuard } from '../../guards/auth.guard';

@Controller('workspace')
@UseGuards(AuthGuard)
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Post()
  create(
    @Body() createWorkspaceDto: CreateWorkspaceDto,
    @Request() req,
  ): Promise<WorkspaceResponseDto> {
    return this.workspaceService.create(createWorkspaceDto, req.user.userId);
  }

  @Get()
  findAll(): Promise<WorkspaceResponseDto[]> {
    return this.workspaceService.findAll();
  }

  @Delete(':id')
  async delete(@Param('id') id: number, @Request() req): Promise<void> {
    return this.workspaceService.delete(id, req.user.userId);
  }
}
