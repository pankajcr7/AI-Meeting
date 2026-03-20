import mongoose, { Document, Schema } from 'mongoose';

export interface IIntegration extends Document {
  team: mongoose.Types.ObjectId;
  type: 'slack' | 'notion' | 'asana';
  accessToken: string;
  refreshToken?: string;
  externalWorkspaceId?: string;
  externalWorkspaceName?: string;
  settings: {
    autoSync: boolean;
    channelId?: string;
    databaseId?: string;
    projectId?: string;
  };
  connectedBy?: mongoose.Types.ObjectId;
  connectedAt: Date;
  updatedAt: Date;
}

const integrationSchema = new Schema<IIntegration>({
  team: {
    type: Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  type: {
    type: String,
    enum: ['slack', 'notion', 'asana'],
    required: true,
  },
  accessToken: {
    type: String,
    required: true,
  },
  refreshToken: {
    type: String,
  },
  externalWorkspaceId: {
    type: String,
  },
  externalWorkspaceName: {
    type: String,
  },
  settings: {
    autoSync: {
      type: Boolean,
      default: false,
    },
    channelId: {
      type: String,
    },
    databaseId: {
      type: String,
    },
    projectId: {
      type: String,
    },
  },
  connectedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  connectedAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

integrationSchema.index({ team: 1, type: 1 }, { unique: true });

integrationSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model<IIntegration>('Integration', integrationSchema);
