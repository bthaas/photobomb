import { Module } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncResolver } from './sync.resolver';
import { PhotosModule } from '../photos/photos.module';

@Module({
  imports: [PhotosModule],
  providers: [SyncService, SyncResolver],
})
export class SyncModule {}