export interface User {
  _id: string;
  email: string;
  name: string;
  avatar?: string;
  googleId?: string;
  teams: Team[];
  activeTeam?: Team;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  user: User | string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface Team {
  _id: string;
  name: string;
  owner: User | string;
  members: TeamMember[];
  inviteCode?: string;
  createdAt: string;
}

export interface Meeting {
  _id: string;
  title: string;
  team: Team | string;
  uploadedBy: User | string;
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
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActionItem {
  _id: string;
  meeting: Meeting | string;
  team: Team | string;
  title: string;
  description?: string;
  assignee?: string;
  assigneeUser?: User | string;
  deadline?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed';
  syncedTo: {
    platform: 'slack' | 'notion' | 'asana';
    externalId: string;
    syncedAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface Integration {
  _id: string;
  team: Team | string;
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
  connectedBy?: User | string;
  connectedAt: string;
  updatedAt: string;
}

export interface Reminder {
  _id: string;
  actionItem: ActionItem | string;
  user: User | string;
  type: 'email' | 'in-app';
  message?: string;
  scheduledAt: string;
  sentAt?: string;
  status: 'pending' | 'sent' | 'failed';
  createdAt: string;
}
