import { Repository } from 'typeorm';
import { Photo } from '../entities/photo.entity';
import { CreatePhotoInput } from './dto/create-photo.input';
import { UpdatePhotoInput } from './dto/update-photo.input';
import { PhotosFilterInput } from './dto/photos-filter.input';
export declare class PhotosService {
    private photosRepository;
    constructor(photosRepository: Repository<Photo>);
    create(createPhotoInput: CreatePhotoInput, userId: string): Promise<Photo>;
    findAll(userId: string, filter?: PhotosFilterInput): Promise<Photo[]>;
    findById(id: string, userId: string): Promise<Photo | null>;
    findSimilar(photoId: string, userId: string, limit?: number): Promise<Photo[]>;
    update(id: string, updatePhotoInput: UpdatePhotoInput, userId: string): Promise<Photo>;
    updateAnalysis(id: string, analysisData: {
        embedding?: number[];
        qualityScore?: number;
        compositionScore?: number;
        contentScore?: number;
        detectedObjects?: any[];
        detectedFaces?: any[];
        dominantColors?: string[];
    }, userId: string): Promise<Photo>;
    markAsCurated(ids: string[], userId: string): Promise<void>;
    softDelete(id: string, userId: string): Promise<void>;
    getPhotoStats(userId: string): Promise<{
        total: number;
        curated: number;
        analyzed: number;
        synced: number;
    }>;
}
