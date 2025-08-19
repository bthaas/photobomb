import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Photo } from './photo.entity';

@ObjectType()
@Entity('users')
export class User {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ unique: true })
  email: string;

  @Column()
  password: string; // Not exposed in GraphQL

  @Field({ nullable: true })
  @Column({ nullable: true })
  firstName?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  lastName?: string;

  @Field()
  @Column({ default: 'free' })
  subscriptionType: 'free' | 'premium';

  @Field({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  subscriptionExpiresAt?: Date;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @Field(() => [Photo])
  @OneToMany(() => Photo, photo => photo.user)
  photos: Photo[];

  // User preferences (stored as JSON)
  @Field({ nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  preferences?: {
    defaultCurationGoal?: string;
    autoAnalyze?: boolean;
    backgroundProcessing?: boolean;
    hapticFeedback?: boolean;
    cloudSync?: boolean;
    privacyMode?: boolean;
  };
}