import { InputType, Field, Int, Float } from '@nestjs/graphql';
import { IsOptional, IsDateString } from 'class-validator';

@InputType()
export class PhotosFilterInput {
  @Field({ nullable: true })
  @IsOptional()
  isCurated?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  clusterId?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  minQualityScore?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  dateFrom?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  dateTo?: Date;

  @Field(() => Int, { nullable: true, defaultValue: 100 })
  @IsOptional()
  limit?: number;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  @IsOptional()
  offset?: number;
}