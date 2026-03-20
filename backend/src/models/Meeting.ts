import mongoose, { Document, Schema } from 'mongoose';

export interface IMeeting extends Document {
  title: string;
  team: mongoose.Types.ObjectId;
  uploadedBy: mongoose.Types.ObjectId;
  audioUrl?: string;
  duration?: number;
  status: 'uploading' | 'processing' | 'transcribing' | 'summarizing' | 'completed' | 'failed';
  transcript?: string;
  summary?: string;
  participants: string[];
  recordingType: 'upload' | 'browser';
  fileSize?: number;
  mimeType?: string;
  errorMessage?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const meetingSchema = new Schema<IMeeting>({
  title: {
    type: String,
    required: true,
  },
  team: {
    type: Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  audioUrl: {
    type: String,
  },
  duration: {
    type: Number,
  },
  status: {
    type: String,
    enum: ['uploading', 'processing', 'transcribing', 'summarizing', 'completed', 'failed'],
    default: 'uploading',
  },
  transcript: {
    type: String,
  },
  summary: {
    type: String,
  },
  participants: [{
    type: String,
  }],
  recordingType: {
    type: String,
    enum: ['upload', 'browser'],
    default: 'upload',
  },
  fileSize: {
    type: Number,
  },
  mimeType: {
    type: String,
  },
  errorMessage: {
    type: String,
  },
  processedAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

meetingSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model<IMeeting>('Meeting', meetingSchema);
