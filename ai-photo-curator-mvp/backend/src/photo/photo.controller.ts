import {
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AiService } from '../ai/ai.service';
import { Express } from 'express';

@Controller('photo')
export class PhotoController {
  constructor(private readonly aiService: AiService) {}

  @Post('analyze')
  @UseInterceptors(FilesInterceptor('photos', 20, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB per file
    },
    fileFilter: (req, file, cb) => {
      // Accept only image files
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Only image files are allowed'), false);
      }
    },
  }))
  async analyzePhotos(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No photos provided');
    }

    if (files.length < 2) {
      throw new BadRequestException('At least 2 photos are required for comparison');
    }

    if (files.length > 20) {
      throw new BadRequestException('Maximum 20 photos allowed');
    }

    try {
      // Extract image buffers
      const imageBuffers = files.map(file => file.buffer);
      
      // Analyze with AI
      const result = await this.aiService.analyzeBestPhoto(imageBuffers);
      
      // Validate the result
      if (result.bestPhotoIndex < 0 || result.bestPhotoIndex >= files.length) {
        throw new Error('Invalid photo index returned from AI');
      }

      return {
        success: true,
        bestPhotoIndex: result.bestPhotoIndex,
        reasoning: result.reasoning,
        totalPhotos: files.length,
        selectedPhoto: {
          originalName: files[result.bestPhotoIndex].originalname,
          size: files[result.bestPhotoIndex].size,
          mimeType: files[result.bestPhotoIndex].mimetype,
        },
      };
    } catch (error) {
      console.error('Photo analysis error:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          success: false,
          message: 'Failed to analyze photos',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('health')
  async healthCheck() {
    return {
      success: true,
      message: 'AI Photo Curator backend is running',
      timestamp: new Date().toISOString(),
    };
  }
}