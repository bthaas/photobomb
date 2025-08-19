import { User } from './user.entity';
export declare class Photo {
    id: string;
    originalFilename: string;
    s3Key: string;
    s3Bucket: string;
    mimeType: string;
    fileSize: number;
    width: number;
    height: number;
    exifData?: any;
    location?: {
        latitude: number;
        longitude: number;
        address?: string;
    };
    takenAt?: Date;
    embedding?: string;
    qualityScore?: number;
    compositionScore?: number;
    contentScore?: number;
    detectedObjects?: any[];
    detectedFaces?: any[];
    dominantColors?: string[];
    clusterId?: string;
    curationRank?: number;
    isCurated: boolean;
    isDeleted: boolean;
    syncStatus: 'pending' | 'synced' | 'failed';
    createdAt: Date;
    updatedAt: Date;
    user: User;
    userId: string;
}
