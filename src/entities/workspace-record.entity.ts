import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Workspace } from './workspace.entity';

@Entity()
export class WorkspaceRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  filePath: string;

  @Column()
  etag: string;

  @Column('bigint')
  size: number;

  @ManyToOne(() => Workspace, { eager: true })
  workspace: Workspace;

  @ManyToOne(() => User, { eager: true })
  modifier: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 