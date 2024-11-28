import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { SyncTask } from './sync-task.entity';

export enum SyncTaskRecordStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
}

@Entity()
export class SyncTaskRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => SyncTask, syncTask => syncTask.records, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'syncTaskId' })
  syncTask: SyncTask;

  @Column()
  syncTaskId: number;

  @Column()
  filePath: string;

  @Column()
  fileName: string;

  @Column()
  fileSize: number;

  @Column()
  fileMd5: string;

  @Column()
  lastModified: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'modifierId' })
  modifier: User;

  @Column()
  modifierId: number;

  @Column({
    type: 'enum',
    enum: SyncTaskRecordStatus,
    default: SyncTaskRecordStatus.SUCCESS,
  })
  status: SyncTaskRecordStatus;

  @Column({ nullable: true })
  errorMessage?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 