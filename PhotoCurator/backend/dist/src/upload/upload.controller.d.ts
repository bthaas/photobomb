import { UploadService } from './upload.service';
import { PhotosService } from '../photos/photos.service';
export declare class UploadController {
    private uploadService;
    private photosService;
    constructor(uploadService: UploadService, photosService: PhotosService);
    uploadPhoto(file: Express.Multer.File, metadata: any, req: any): Promise<{
        success: boolean;
        photo: import("../entities/photo.entity").Photo;
        uploadUrl: string;
    }>;
    getPresignedUploadUrl(body: {
        filename: string;
        contentType: string;
    }, req: any): Promise<{
        uploadUrl: string;
        key: string;
        fields: any;
    }>;
    getSignedUrl(photoId: string, expiresIn: string, req: any): Promise<{
        signedUrl: string;
    }>;
}
