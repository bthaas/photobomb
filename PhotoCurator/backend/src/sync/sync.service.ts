import { Injectable } from '@nestjs/common';
import { PhotosService } from '../photos/photos.service';
import { SyncMetadataInput } from './dto/sync-metadata.input';
import { SyncStatusResponse } from './dto/sync-status.response';

@Injectable()
export class SyncService {
  constructor(private photosService: PhotosService) {}

  async syncPhotoMetadata(
    photoId: string,
    metadata: SyncMetadataInput,
    userId: string,
  ): Promise<boolean> {
    try {
      await this.photosService.updateAnalysis(
        photoId,
        {
          embedding: metadata.embedding,
          qualityScore: metadata.qualityScore,
          compositionScore: metadata.compositionScore,
          contentScore: metadata.contentScore,
          detectedObjects: metadata.detectedObjects,
          detectedFaces: metadata.detectedFaces,
          dominantColors: metadata.dominantColors,
        },
        userId,
      );

      // Update sync status
      await this.photosService.update(
        photoId,
        { syncStatus: 'synced' as any },
        userId,
      );

      return true;
    } catch (error) {
      // Mark as failed sync
      await this.photosService.update(
        photoId,
        { syncStatus: 'failed' as any },
        userId,
      );
      throw error;
    }
  }

  async batchSyncMetadata(
    syncData: Array<{ photoId: string; metadata: SyncMetadataInput }>,
    userId: string,
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const { photoId, metadata } of syncData) {
      try {
        await this.syncPhotoMetadata(photoId, metadata, userId);
        success++;
      } catch (error) {
        failed++;
        errors.push(`Photo ${photoId}: ${error.message}`);
      }
    }

    return { success, failed, errors };
  }

  async getSyncStatus(userId: string): Promise<SyncStatusResponse> {
    const stats = await this.photosService.getPhotoStats(userId);
    
    return {
      totalPhotos: stats.total,
      syncedPhotos: stats.synced,
      pendingPhotos: stats.total - stats.synced,
      lastSyncAt: new Date(), // This would be stored in user preferences
      syncProgress: stats.total > 0 ? (stats.synced / stats.total) * 100 : 0,
    };
  }

  async markPhotosForSync(photoIds: string[], userId: string): Promise<boolean> {
    try {
      for (const photoId of photoIds) {
        await this.photosService.update(
          photoId,
          { syncStatus: 'pending' as any },
          userId,
        );
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  async getCuratedPhotosForSync(userId: string): Promise<any[]> {
    const curatedPhotos = await this.photosService.findAll(userId, {
      isCurated: true,
      limit: 1000,
    });

    return curatedPhotos.map(photo => ({
      id: photo.id,
      s3Key: photo.s3Key,
      s3Bucket: photo.s3Bucket,
      metadata: {
        originalFilename: photo.originalFilename,
        mimeType: photo.mimeType,
        fileSize: photo.fileSize,
        width: photo.width,
        height: photo.height,
        takenAt: photo.takenAt,
        location: photo.location,
        qualityScore: photo.qualityScore,
        compositionScore: photo.compositionScore,
        contentScore: photo.contentScore,
        curationRank: photo.curationRank,
      },
    }));
  }
}