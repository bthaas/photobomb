import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';
import { User } from './user.entity';

@ObjectType()
@Entity('photos')
export class Photo {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  filename: string;

  @Field()
  @Column()
  originalUri: string; // Original photo URI from device

  @Field({ nullable: true })
  @Column({ nullable: true })
  cloudUri?: string; // S3 or cloud storage URI

  @Field(() => Int)
  @Column()
  width: number;

  @Field(() => Int)
  @Column()
  height: number;

  @Field(() => Int)
  @Column()
  fileSize: number;

  @Field()
  @Column({ type: 'timestamp' })
  capturedAt: Date;

  @Field({ nullable: true })
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude?: number;

  @Field({ nullable: true })
  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude?: number;

  // AI Analysis Results
  @Field(() => Float, { nullable: true })
  @Column({ type: 'float', nullable: true })
  overallScore?: number;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'float', nullable: true })
  technicalScore?: number;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'float', nullable: true })
  compositionalScore?: number;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'float', nullable: true })
  contentScore?: number;

  @Field(() => Int, { nullable: true })
  @Column({ nullable: true })
  faceCount?: number;

  // Visual embedding for similarity search (using pgvector extension)
  @Column({ type: 'vector', length: 128, nullable: true })
  visualEmbedding?: number[];

  // User actions
  @Field()
  @Column({ default: false })
  isFavorite: boolean;

  @Field()
  @Column({ default: false })
  isDeleted: boolean;

  @Field(() => [String])
  @Column({ type: 'text', array: true, default: [] })
  tags: string[];

  // Analysis metadata
  @Field({ nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  analysisMetadata?: {
    faces?: Array<{
      boundingBox: { x: number; y: number; width: number; height: number };
      confidence: number;
      personId?: string;
    }>;
    objects?: Array<{
      label: string;
      confidence: number;
      boundingBox: { x: number; y: number; width: number; height: number };
    }>;
    isAnalyzed: boolean;
    analysisTimestamp: number;
  };

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @Field(() => User)
  @ManyToOne(() => User, user => user.photos)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;
}