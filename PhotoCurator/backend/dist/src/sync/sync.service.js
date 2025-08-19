"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncService = void 0;
const common_1 = require("@nestjs/common");
const photos_service_1 = require("../photos/photos.service");
let SyncService = class SyncService {
    constructor(photosService) {
        this.photosService = photosService;
    }
    async syncPhotoMetadata(photoId, metadata, userId) {
        try {
            await this.photosService.updateAnalysis(photoId, {
                embedding: metadata.embedding,
                qualityScore: metadata.qualityScore,
                compositionScore: metadata.compositionScore,
                contentScore: metadata.contentScore,
                detectedObjects: metadata.detectedObjects,
                detectedFaces: metadata.detectedFaces,
                dominantColors: metadata.dominantColors,
            }, userId);
            await this.photosService.update(photoId, { syncStatus: 'synced' }, userId);
            return true;
        }
        catch (error) {
            await this.photosService.update(photoId, { syncStatus: 'failed' }, userId);
            throw error;
        }
    }
    async batchSyncMetadata(syncData, userId) {
        let success = 0;
        let failed = 0;
        const errors = [];
        for (const { photoId, metadata } of syncData) {
            try {
                await this.syncPhotoMetadata(photoId, metadata, userId);
                success++;
            }
            catch (error) {
                failed++;
                errors.push(`Photo ${photoId}: ${error.message}`);
            }
        }
        return { success, failed, errors };
    }
    async getSyncStatus(userId) {
        const stats = await this.photosService.getPhotoStats(userId);
        return {
            totalPhotos: stats.total,
            syncedPhotos: stats.synced,
            pendingPhotos: stats.total - stats.synced,
            lastSyncAt: new Date(),
            syncProgress: stats.total > 0 ? (stats.synced / stats.total) * 100 : 0,
        };
    }
    async markPhotosForSync(photoIds, userId) {
        try {
            for (const photoId of photoIds) {
                await this.photosService.update(photoId, { syncStatus: 'pending' }, userId);
            }
            return true;
        }
        catch (error) {
            return false;
        }
    }
    async getCuratedPhotosForSync(userId) {
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
};
exports.SyncService = SyncService;
exports.SyncService = SyncService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [photos_service_1.PhotosService])
], SyncService);
//# sourceMappingURL=sync.service.js.map