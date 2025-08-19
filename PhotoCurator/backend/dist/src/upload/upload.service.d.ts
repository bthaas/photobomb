import { ConfigService } from '@nestjs/config';
export declare class UploadService {
    private configService;
    private s3;
    private bucketName;
    constructor(configService: ConfigService);
    uploadFile(file: Express.Multer.File, userId: string, folder?: string): Promise<{
        key: string;
        url: string;
        bucket: string;
    }>;
    getSignedUrl(key: string, expiresIn?: number): Promise<string>;
    deleteFile(key: string): Promise<void>;
    generatePresignedUploadUrl(userId: string, filename: string, contentType: string, folder?: string): Promise<{
        uploadUrl: string;
        key: string;
        fields: any;
    }>;
}
