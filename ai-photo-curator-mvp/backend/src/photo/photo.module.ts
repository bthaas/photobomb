import { Module } from '@nestjs/common';
import { PhotoController } from './photo.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [PhotoController],
})
export class PhotoModule {}