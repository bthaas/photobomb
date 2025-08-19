import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Request,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadService } from './upload.service';
import { PhotosService } from '../photos/photos.service';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(
    private uploadService: UploadService,
    private photosService: PhotosService,
  ) {}

  @Post('photo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPhoto(
    @UploadedFile() file: Express.Multer.File,
    @Body() metadata: any,
    @Request() req,
  ) {
    const userId = req.user.id;

    // Upload file to S3
    const uploadResult = await this.uploadService.uploadFile(file, userId, 'photos');

    // Create photo record in database
    const photo = await this.photosService.create(
      {
        originalFilename: file.originalname,
        s3Key: uploadResult.key,
        s3Bucket: uploadResult.bucket,
        mimeType: file.mimetype,
        fileSize: file.size,
        width: metadata.width ? parseInt(metadata.width) : 0,
        height: metadata.height ? parseInt(metadata.height) : 0,
        exifData: metadata.exifData ? JSON.parse(metadata.exifData) : null,
        location: metadata.location ? JSON.parse(metadata.location) : null,
        takenAt: metadata.takenAt ? new Date(metadata.takenAt) : null,
      },
      userId,
    );

    return {
      success: true,
      photo,
      uploadUrl: uploadResult.url,
    };
  }

  @Post('presigned-url')
  async getPresignedUploadUrl(
    @Body() body: { filename: string; contentType: string },
    @Request() req,
  ) {
    const userId = req.user.id;
    const { filename, contentType } = body;

    const result = await this.uploadService.generatePresignedUploadUrl(
      userId,
      filename,
      contentType,
    );

    return result;
  }

  @Get('signed-url/:photoId')
  async getSignedUrl(
    @Param('photoId') photoId: string,
    @Query('expiresIn') expiresIn: string,
    @Request() req,
  ) {
    const userId = req.user.id;
    const photo = await this.photosService.findById(photoId, userId);

    if (!photo) {
      throw new Error('Photo not found');
    }

    const signedUrl = await this.uploadService.getSignedUrl(
      photo.s3Key,
      expiresIn ? parseInt(expiresIn) : 3600,
    );

    return { signedUrl };
  }
}