import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field, ID, Float, Int } from '@nestjs/graphql';
import { User } from './user.entity';

@ObjectType()
@Entity('photos')
export class Photo {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  originalFilename: string;

  @Field()
  @Column()
  s3Key: string;

  @Field()
  @Column()
  s3Bucket: string;

  @Field()
  @Column()
  mimeType: string;

  @Field(() => Int)
  @Column()
  fileSize: number;

  @Field(() => Int)
  @Column()
  width: number;

  @Field(() => Int)
  @Column()
  height: number;

  @Field({ nullable: true })
  @Column('jsonb', { nullable: true })
  exifData?: any;

  @Field({ nullable: true })
  @Column('jsonb', { nullable: true })
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };

  @Field({ nullable: true })
  @Column({ nullable: true })
  takenAt?: Date;

  // AI Analysis Results
  @Column('text', { nullable: true })
  embedding?: string; // Store as JSON string for vector data

  @Field(() => Float, { nullable: true })
  @Column('float', { nullable: true })
  qualityScore?: number;

  @Field(() => Float, { nullable: true })
  @Column('float', { nullable: true })
  compositionScore?: number;

  @Field(() => Float, { nullable: true })
  @Column('float', { nullable: true })
  contentScore?: number;

  @Field({ nullable: true })
  @Column('jsonb', { nullable: true })
  detectedObjects?: any[];

  @Field({ nullable: true })
  @Column('jsonb', { nullable: true })
  detectedFaces?: any[];

  @Field({ nullable: true })
  @Column('jsonb', { nullable: true })
  dominantColors?: string[];

  // Clustering and Curation
  @Field({ nullable: true })
  @Column({ nullable: true })
  clusterId?: string;

  @Field(() => Float, { nullable: true })
  @Column('float', { nullable: true })
  curationRank?: number;

  @Field()
  @Column({ default: false })
  isCurated: boolean;

  @Field()
  @Column({ default: false })
  isDeleted: boolean;

  // Sync Status
  @Field()
  @Column({ default: 'pending' })
  syncStatus: 'pending' | 'synced' | 'failed';

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;

  @Field(() => User)
  @ManyToOne(() => User, user => user.photos)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;
}