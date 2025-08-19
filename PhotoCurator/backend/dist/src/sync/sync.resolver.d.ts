import { SyncService } from './sync.service';
import { SyncMetadataInput } from './dto/sync-metadata.input';
import { BatchSyncInput } from './dto/batch-sync.input';
import { BatchSyncResponse } from './dto/batch-sync.response';
import { SyncStatusResponse } from './dto/sync-status.response';
export declare class SyncResolver {
    private syncService;
    constructor(syncService: SyncService);
    syncPhotoMetadata(photoId: string, metadata: SyncMetadataInput, context: any): Promise<boolean>;
    batchSyncMetadata(syncData: BatchSyncInput, context: any): Promise<BatchSyncResponse>;
    syncStatus(context: any): Promise<SyncStatusResponse>;
    markPhotosForSync(photoIds: string[], context: any): Promise<boolean>;
    curatedPhotosForSync(context: any): Promise<any[]>;
}
