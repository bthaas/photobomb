import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Photo } from '../entities/photo.entity';

@Injectable()
export class PhotosService {
  constructor(
    @InjectRepository(Photo)
    private photoRepository: Repository<Photo>,
  ) {}

  async findByUser(userId: string): Promise<Photo[]> {
    return this.photoRepository.find({
      where: { userId, isDeleted: false },
      order: { capturedAt: 'DESC' },
    });
  }

  async create(userId: string, photoData: Partial<Photo>): Promise<Photo> {
    const photo = this.photoRepository.create({
      ...photoData,
      userId,
    });
    return this.photoRepository.save(photo);
  }

  async updateAnalysis(photoId: string, analysisData: any): Promise<Photo> {
    await this.photoRepository.update(photoId, {
      ...analysisData,
      analysisMetadata: {
        ...analysisData.analysisMetadata,
        isAnalyzed: true,
        analysisTimestamp: Date.now(),
      },
    });
    return this.photoRepository.findOne({ where: { id: photoId } });
  }

  async findSimilar(embedding: number[], userId: string, limit: number = 10): Promise<Photo[]> {
    // This would use pgvector for similarity search in a real implementation
    // For now, return empty array as placeholder
    return [];
  }
}