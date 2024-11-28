import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Workspace } from './workspace.entity';
import { SyncTaskRecord } from './sync-task-record.entity';

export enum SyncTaskStatus {
  SUCCESS = 'success',
  PARTIAL_SUCCESS = 'partial_success',
  FAILED = 'failed',
}

@Entity()
export class SyncTask {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Workspace)
  @JoinColumn({ name: 'workspaceId' })
  workspace: Workspace;

  @Column()
  workspaceId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'creatorId' })
  creator: User;

  @Column()
  creatorId: number;

  @Column({
    type: 'enum',
    enum: ['dev', 'test', 'prod'],
  })
  targetEnv: string;

  @Column({
    type: 'enum',
    enum: SyncTaskStatus,
    default: SyncTaskStatus.SUCCESS,
  })
  status: SyncTaskStatus;

  @Column({ default: 0 })
  totalFiles: number;

  @Column({ default: 0 })
  failedFiles: number;

  @OneToMany(() => SyncTaskRecord, record => record.syncTask)
  records: SyncTaskRecord[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 