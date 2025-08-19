import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PhotosService } from './photos.service';
import { Photo } from '../entities/photo.entity';
import { User } from '../entities/user.entity';

@Resolver(() => Photo)
export class PhotosResolver {
  constructor(private photosService: PhotosService) {}

  @Query(() => [Photo])
  @UseGuards(JwtAuthGuard)
  async myPhotos(@CurrentUser() user: User): Promise<Photo[]> {
    return this.photosService.findByUser(user.id);
  }

  @Mutation(() => Photo)
  @UseGuards(JwtAuthGuard)
  async syncPhoto(
    @CurrentUser() user: User,
    @Args('photoData') photoData: any,
  ): Promise<Photo> {
    return this.photosService.create(user.id, photoData);
  }
}