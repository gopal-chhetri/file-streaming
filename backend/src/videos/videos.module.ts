import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import {
  VideosController,
  WatchHistoryController,
  WatchLaterController,
} from './videos.controller';
import { VideosService } from './videos.service';
import { Video } from './entities/video.entity';
import { WatchHistory } from './entities/watch-history.entity';
import { WatchLater } from './entities/watch-later.entity';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@Module({
  imports: [MikroOrmModule.forFeature([Video, WatchHistory, WatchLater])],
  controllers: [VideosController, WatchHistoryController, WatchLaterController],
  providers: [VideosService, ApiKeyGuard],
  exports: [VideosService],
})
export class VideosModule {}
