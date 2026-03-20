import mongoose, { Document, Schema } from 'mongoose';

export interface IReminder extends Document {
  actionItem: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  type: 'email' | 'in-app';
  message?: string;
  scheduledAt: Date;
  sentAt?: Date;
  status: 'pending' | 'sent' | 'failed';
  createdAt: Date;
}

const reminderSchema = new Schema<IReminder>({
  actionItem: {
    type: Schema.Types.ObjectId,
    ref: 'ActionItem',
    required: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['email', 'in-app'],
    default: 'in-app',
  },
  message: {
    type: String,
  },
  scheduledAt: {
    type: Date,
    required: true,
  },
  sentAt: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<IReminder>('Reminder', reminderSchema);
