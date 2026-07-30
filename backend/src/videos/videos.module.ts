import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { VideosController, WatchHistoryController } from './videos.controller';
import { VideosService } from './videos.service';
import { Video } from './entities/video.entity';
import { WatchHistory } from './entities/watch-history.entity';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@Module({
  imports: [MikroOrmModule.forFeature([Video, WatchHistory])],
  controllers: [VideosController, WatchHistoryController],
  providers: [VideosService, ApiKeyGuard],
  exports: [VideosService],
})
export class VideosModule {}
