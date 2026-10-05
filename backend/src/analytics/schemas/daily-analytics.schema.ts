import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export const RETENTION_BUCKETS = 20;

/** Bucket index (0..19) for how far into the video a session got. */
export function retentionBucket(percentage: number): number {
  return Math.min(RETENTION_BUCKETS - 1, Math.max(0, Math.floor(percentage / 5)));
}

export interface RetentionPoint {
  position: number;
  viewers: number;
  percentage: number;
}

@Schema({ collection: 'daily_analytics', timestamps: true })
export class DailyAnalytics extends Document {
  @Prop({ required: true })
  videoId!: string;

  @Prop({ required: true })
  date!: string;

  @Prop({ default: 0 })
  totalViews!: number;

  @Prop({ default: 0 })
  uniqueViewers!: number;

  @Prop({ default: 0 })
  completions!: number;

  @Prop({ default: 0 })
  totalWatchTimeSeconds!: number;

  /**
   * Legacy: one point per session, appended forever. Unbounded growth would
   * hit MongoDB's 16 MB document limit on popular videos, so it is no longer
   * written; still read for old data.
   */
  @Prop({
    type: [{ position: Number, viewers: Number, percentage: Number }],
    default: [],
  })
  retentionCurve!: RetentionPoint[];

  /**
   * Sessions that ended in each 5% band of the video: keys b0..b19 (b0 =
   * 0-5%, b19 = 95-100%). Fixed size, updated with $inc.
   */
  @Prop({ type: Map, of: Number, default: {} })
  retentionBuckets!: Map<string, number>;
}

export const DailyAnalyticsSchema =
  SchemaFactory.createForClass(DailyAnalytics);
DailyAnalyticsSchema.index({ videoId: 1, date: 1 }, { unique: true });
