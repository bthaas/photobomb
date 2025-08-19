import { PhotosService } from '../photos/photos.service';
import { SyncMetadataInput } from './dto/sync-metadata.input';
import { SyncStatusResponse } from './dto/sync-status.response';
export declare class SyncService {
    private photosService;
    constructor(photosService: PhotosService);
    syncPhotoMetadata(photoId: string, metadata: SyncMetadataInput, userId: string): Promise<boolean>;
    batchSyncMetadata(syncData: Array<{
        photoId: string;
        metadata: SyncMetadataInput;
    }>, userId: string): Promise<{
        success: number;
        failed: number;
        errors: string[];
    }>;
    getSyncStatus(userId: string): Promise<SyncStatusResponse>;
    markPhotosForSync(photoIds: string[], userId: string): Promise<boolean>;
    getCuratedPhotosForSync(userId: string): Promise<any[]>;
}
