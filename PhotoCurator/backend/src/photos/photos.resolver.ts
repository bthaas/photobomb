import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';

import { PhotosService } from './photos.service';
import { Photo } from '../entities/photo.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePhotoInput } from './dto/create-photo.input';
import { UpdatePhotoInput } from './dto/update-photo.input';
import { PhotosFilterInput } from './dto/photos-filter.input';
import { PhotoStatsResponse } from './dto/photo-stats.response';

@Resolver(() => Photo)
@UseGuards(JwtAuthGuard)
export class PhotosResolver {
  constructor(private photosService: PhotosService) {}

  @Query(() => [Photo])
  async photos(
    @Args('filter', { nullable: true }) filter: PhotosFilterInput,
    @Context() context,
  ): Promise<Photo[]> {
    const userId = context.req.user.id;
    return this.photosService.findAll(userId, filter);
  }

  @Query(() => Photo, { nullable: true })
  async photo(
    @Args('id') id: string,
    @Context() context,
  ): Promise<Photo | null> {
    const userId = context.req.user.id;
    return this.photosService.findById(id, userId);
  }

  @Query(() => [Photo])
  async similarPhotos(
    @Args('photoId') photoId: string,
    @Args('limit', { defaultValue: 10 }) limit: number,
    @Context() context,
  ): Promise<Photo[]> {
    const userId = context.req.user.id;
    return this.photosService.findSimilar(photoId, userId, limit);
  }

  @Query(() => PhotoStatsResponse)
  async photoStats(@Context() context): Promise<PhotoStatsResponse> {
    const userId = context.req.user.id;
    return this.photosService.getPhotoStats(userId);
  }

  @Mutation(() => Photo)
  async createPhoto(
    @Args('createPhotoInput') createPhotoInput: CreatePhotoInput,
    @Context() context,
  ): Promise<Photo> {
    const userId = context.req.user.id;
    return this.photosService.create(createPhotoInput, userId);
  }

  @Mutation(() => Photo)
  async updatePhoto(
    @Args('id') id: string,
    @Args('updatePhotoInput') updatePhotoInput: UpdatePhotoInput,
    @Context() context,
  ): Promise<Photo> {
    const userId = context.req.user.id;
    return this.photosService.update(id, updatePhotoInput, userId);
  }

  @Mutation(() => Boolean)
  async markPhotosAsCurated(
    @Args('ids', { type: () => [String] }) ids: string[],
    @Context() context,
  ): Promise<boolean> {
    const userId = context.req.user.id;
    await this.photosService.markAsCurated(ids, userId);
    return true;
  }

  @Mutation(() => Boolean)
  async deletePhoto(
    @Args('id') id: string,
    @Context() context,
  ): Promise<boolean> {
    const userId = context.req.user.id;
    await this.photosService.softDelete(id, userId);
    return true;
  }
}