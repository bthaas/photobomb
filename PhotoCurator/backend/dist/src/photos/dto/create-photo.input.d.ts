export declare class CreatePhotoInput {
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
}
