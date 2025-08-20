import { Module } from '@nestjs/common';
import { PhotoModule } from './photo/photo.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [PhotoModule, AiModule],
})
export class AppModule {}