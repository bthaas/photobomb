import { SyncMetadataInput } from './sync-metadata.input';
declare class SyncItemInput {
    photoId: string;
    metadata: SyncMetadataInput;
}
export declare class BatchSyncInput {
    items: SyncItemInput[];
}
export {};
