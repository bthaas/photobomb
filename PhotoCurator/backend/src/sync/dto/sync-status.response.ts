import { ObjectType, Field, Int, Float } from '@nestjs/graphql';

@ObjectType()
export class SyncStatusResponse {
  @Field(() => Int)
  totalPhotos: number;

  @Field(() => Int)
  syncedPhotos: number;

  @Field(() => Int)
  pendingPhotos: number;

  @Field()
  lastSyncAt: Date;

  @Field(() => Float)
  syncProgress: number;
}