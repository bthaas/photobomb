import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class PhotoStatsResponse {
  @Field(() => Int)
  total: number;

  @Field(() => Int)
  curated: number;

  @Field(() => Int)
  analyzed: number;

  @Field(() => Int)
  synced: number;
}