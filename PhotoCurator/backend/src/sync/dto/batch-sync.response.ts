import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class BatchSyncResponse {
  @Field(() => Int)
  success: number;

  @Field(() => Int)
  failed: number;

  @Field(() => [String])
  errors: string[];
}