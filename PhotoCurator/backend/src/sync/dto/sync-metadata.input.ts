import { InputType, Field, Float } from '@nestjs/graphql';
import { IsOptional, IsArray } from 'class-validator';

@InputType()
export class SyncMetadataInput {
  @Field(() => [Float], { nullable: true })
  @IsOptional()
  @IsArray()
  embedding?: number[];

  @Field(() => Float, { nullable: true })
  @IsOptional()
  qualityScore?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  compositionScore?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  contentScore?: number;

  @Field({ nullable: true })
  @IsOptional()
  detectedObjects?: any[];

  @Field({ nullable: true })
  @IsOptional()
  detectedFaces?: any[];

  @Field(() => [String], { nullable: true })
  @IsOptional()
  dominantColors?: string[];
}