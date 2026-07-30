import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

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

  @Prop({ type: [{ position: Number, viewers: Number, percentage: Number }], default: [] })
  retentionCurve!: RetentionPoint[];
}

export const DailyAnalyticsSchema = SchemaFactory.createForClass(DailyAnalytics);
DailyAnalyticsSchema.index({ videoId: 1, date: 1 }, { unique: true });
