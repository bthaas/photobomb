import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { PhotosModule } from '../photos/photos.module';

@Module({
  imports: [ConfigModule, PhotosModule],
  providers: [UploadService],
  controllers: [UploadController],
  exports: [UploadService],
})
export class UploadModule {}