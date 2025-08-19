import { InputType, Field } from '@nestjs/graphql';
import { SyncMetadataInput } from './sync-metadata.input';

@InputType()
class SyncItemInput {
  @Field()
  photoId: string;

  @Field(() => SyncMetadataInput)
  metadata: SyncMetadataInput;
}

@InputType()
export class BatchSyncInput {
  @Field(() => [SyncItemInput])
  items: SyncItemInput[];
}