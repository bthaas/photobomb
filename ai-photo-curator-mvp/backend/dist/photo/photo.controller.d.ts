import { AiService } from '../ai/ai.service';
export declare class PhotoController {
    private readonly aiService;
    constructor(aiService: AiService);
    analyzePhotos(files: Express.Multer.File[]): Promise<{
        success: boolean;
        bestPhotoIndex: number;
        reasoning: string;
        totalPhotos: number;
        selectedPhoto: {
            originalName: string;
            size: number;
            mimeType: string;
        };
    }>;
    healthCheck(): Promise<{
        success: boolean;
        message: string;
        timestamp: string;
    }>;
}
