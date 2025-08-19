import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Photo } from '../entities/photo.entity';
import { PhotosService } from './photos.service';
import { PhotosResolver } from './photos.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Photo])],
  providers: [PhotosService, PhotosResolver],
  exports: [PhotosService],
})
export class PhotosModule {}