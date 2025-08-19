import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PhotosService } from './photos.service';
import { PhotosResolver } from './photos.resolver';
import { Photo } from '../entities/photo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Photo])],
  providers: [PhotosService, PhotosResolver],
  exports: [PhotosService],
})
export class PhotosModule {}