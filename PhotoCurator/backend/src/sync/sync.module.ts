import { Module } from '@nestjs/common';
import { PhotosModule } from '../photos/photos.module';
import { SyncService } from './sync.service';
import { SyncResolver } from './sync.resolver';

@Module({
  imports: [PhotosModule],
  providers: [SyncService, SyncResolver],
  exports: [SyncService],
})
export class SyncModule {}