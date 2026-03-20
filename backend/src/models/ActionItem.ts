import mongoose, { Document, Schema } from 'mongoose';

export interface ISyncedTo {
  platform: 'slack' | 'notion' | 'asana';
  externalId: string;
  syncedAt: Date;
}

export interface IActionItem extends Document {
  meeting: mongoose.Types.ObjectId;
  team: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  assignee?: string;
  assigneeUser?: mongoose.Types.ObjectId;
  deadline?: Date;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed';
  syncedTo: ISyncedTo[];
  createdAt: Date;
  updatedAt: Date;
}

const actionItemSchema = new Schema<IActionItem>({
  meeting: {
    type: Schema.Types.ObjectId,
    ref: 'Meeting',
    required: true,
  },
  team: {
    type: Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  assignee: {
    type: String,
  },
  assigneeUser: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  deadline: {
    type: Date,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed'],
    default: 'pending',
  },
  syncedTo: [{
    platform: {
      type: String,
      enum: ['slack', 'notion', 'asana'],
    },
    externalId: {
      type: String,
    },
    syncedAt: {
      type: Date,
    },
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

actionItemSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model<IActionItem>('ActionItem', actionItemSchema);
