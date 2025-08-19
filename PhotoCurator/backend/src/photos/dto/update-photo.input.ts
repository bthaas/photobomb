import { InputType, Field, Float } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';

@InputType()
export class UpdatePhotoInput {
  @Field({ nullable: true })
  @IsOptional()
  clusterId?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  curationRank?: number;

  @Field({ nullable: true })
  @IsOptional()
  isCurated?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  syncStatus?: 'pending' | 'synced' | 'failed';
}