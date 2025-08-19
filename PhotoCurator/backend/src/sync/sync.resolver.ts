import { Resolver, Mutation, Query, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';

import { SyncService } from './sync.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SyncMetadataInput } from './dto/sync-metadata.input';
import { BatchSyncInput } from './dto/batch-sync.input';
import { BatchSyncResponse } from './dto/batch-sync.response';
import { SyncStatusResponse } from './dto/sync-status.response';

@Resolver()
@UseGuards(JwtAuthGuard)
export class SyncResolver {
  constructor(private syncService: SyncService) {}

  @Mutation(() => Boolean)
  async syncPhotoMetadata(
    @Args('photoId') photoId: string,
    @Args('metadata') metadata: SyncMetadataInput,
    @Context() context,
  ): Promise<boolean> {
    const userId = context.req.user.id;
    return this.syncService.syncPhotoMetadata(photoId, metadata, userId);
  }

  @Mutation(() => BatchSyncResponse)
  async batchSyncMetadata(
    @Args('syncData') syncData: BatchSyncInput,
    @Context() context,
  ): Promise<BatchSyncResponse> {
    const userId = context.req.user.id;
    return this.syncService.batchSyncMetadata(syncData.items, userId);
  }

  @Query(() => SyncStatusResponse)
  async syncStatus(@Context() context): Promise<SyncStatusResponse> {
    const userId = context.req.user.id;
    return this.syncService.getSyncStatus(userId);
  }

  @Mutation(() => Boolean)
  async markPhotosForSync(
    @Args('photoIds', { type: () => [String] }) photoIds: string[],
    @Context() context,
  ): Promise<boolean> {
    const userId = context.req.user.id;
    return this.syncService.markPhotosForSync(photoIds, userId);
  }

  @Query(() => [Object])
  async curatedPhotosForSync(@Context() context): Promise<any[]> {
    const userId = context.req.user.id;
    return this.syncService.getCuratedPhotosForSync(userId);
  }
}