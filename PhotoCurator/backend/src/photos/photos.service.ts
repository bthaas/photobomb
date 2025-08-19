import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Photo } from '../entities/photo.entity';
import { CreatePhotoInput } from './dto/create-photo.input';
import { UpdatePhotoInput } from './dto/update-photo.input';
import { PhotosFilterInput } from './dto/photos-filter.input';

@Injectable()
export class PhotosService {
  constructor(
    @InjectRepository(Photo)
    private photosRepository: Repository<Photo>,
  ) {}

  async create(createPhotoInput: CreatePhotoInput, userId: string): Promise<Photo> {
    const photo = this.photosRepository.create({
      ...createPhotoInput,
      userId,
    });
    return this.photosRepository.save(photo);
  }

  async findAll(userId: string, filter?: PhotosFilterInput): Promise<Photo[]> {
    const queryBuilder = this.photosRepository
      .createQueryBuilder('photo')
      .where('photo.userId = :userId', { userId })
      .andWhere('photo.isDeleted = false');

    if (filter?.isCurated !== undefined) {
      queryBuilder.andWhere('photo.isCurated = :isCurated', { 
        isCurated: filter.isCurated 
      });
    }

    if (filter?.clusterId) {
      queryBuilder.andWhere('photo.clusterId = :clusterId', { 
        clusterId: filter.clusterId 
      });
    }

    if (filter?.minQualityScore) {
      queryBuilder.andWhere('photo.qualityScore >= :minQualityScore', { 
        minQualityScore: filter.minQualityScore 
      });
    }

    if (filter?.dateFrom) {
      queryBuilder.andWhere('photo.takenAt >= :dateFrom', { 
        dateFrom: filter.dateFrom 
      });
    }

    if (filter?.dateTo) {
      queryBuilder.andWhere('photo.takenAt <= :dateTo', { 
        dateTo: filter.dateTo 
      });
    }

    return queryBuilder
      .orderBy('photo.takenAt', 'DESC')
      .limit(filter?.limit || 100)
      .offset(filter?.offset || 0)
      .getMany();
  }

  async findById(id: string, userId: string): Promise<Photo | null> {
    return this.photosRepository.findOne({
      where: { id, userId, isDeleted: false },
    });
  }

  async findSimilar(photoId: string, userId: string, limit: number = 10): Promise<Photo[]> {
    // Find similar photos using vector similarity
    const photo = await this.findById(photoId, userId);
    if (!photo || !photo.embedding) {
      return [];
    }

    // For now, return empty array since we're using text storage
    // In production, you would implement proper vector similarity search
    return [];
  }

  async update(id: string, updatePhotoInput: UpdatePhotoInput, userId: string): Promise<Photo> {
    await this.photosRepository.update(
      { id, userId },
      updatePhotoInput,
    );
    return this.findById(id, userId);
  }

  async updateAnalysis(
    id: string,
    analysisData: {
      embedding?: number[];
      qualityScore?: number;
      compositionScore?: number;
      contentScore?: number;
      detectedObjects?: any[];
      detectedFaces?: any[];
      dominantColors?: string[];
    },
    userId: string,
  ): Promise<Photo> {
    // Convert embedding array to JSON string for storage
    const updateData = {
      ...analysisData,
      embedding: analysisData.embedding ? JSON.stringify(analysisData.embedding) : undefined,
    };
    await this.photosRepository.update(
      { id, userId },
      updateData,
    );
    return this.findById(id, userId);
  }

  async markAsCurated(ids: string[], userId: string): Promise<void> {
    await this.photosRepository.update(
      { id: { $in: ids } as any, userId },
      { isCurated: true },
    );
  }

  async softDelete(id: string, userId: string): Promise<void> {
    await this.photosRepository.update(
      { id, userId },
      { isDeleted: true },
    );
  }

  async getPhotoStats(userId: string): Promise<{
    total: number;
    curated: number;
    analyzed: number;
    synced: number;
  }> {
    const [total, curated, analyzed, synced] = await Promise.all([
      this.photosRepository.count({ where: { userId, isDeleted: false } }),
      this.photosRepository.count({ where: { userId, isDeleted: false, isCurated: true } }),
      this.photosRepository.count({ 
        where: { userId, isDeleted: false, qualityScore: { $ne: null } as any } 
      }),
      this.photosRepository.count({ 
        where: { userId, isDeleted: false, syncStatus: 'synced' } 
      }),
    ]);

    return { total, curated, analyzed, synced };
  }
}