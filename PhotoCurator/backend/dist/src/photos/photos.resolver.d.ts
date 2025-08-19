import { PhotosService } from './photos.service';
import { Photo } from '../entities/photo.entity';
import { CreatePhotoInput } from './dto/create-photo.input';
import { UpdatePhotoInput } from './dto/update-photo.input';
import { PhotosFilterInput } from './dto/photos-filter.input';
import { PhotoStatsResponse } from './dto/photo-stats.response';
export declare class PhotosResolver {
    private photosService;
    constructor(photosService: PhotosService);
    photos(filter: PhotosFilterInput, context: any): Promise<Photo[]>;
    photo(id: string, context: any): Promise<Photo | null>;
    similarPhotos(photoId: string, limit: number, context: any): Promise<Photo[]>;
    photoStats(context: any): Promise<PhotoStatsResponse>;
    createPhoto(createPhotoInput: CreatePhotoInput, context: any): Promise<Photo>;
    updatePhoto(id: string, updatePhotoInput: UpdatePhotoInput, context: any): Promise<Photo>;
    markPhotosAsCurated(ids: string[], context: any): Promise<boolean>;
    deletePhoto(id: string, context: any): Promise<boolean>;
}
