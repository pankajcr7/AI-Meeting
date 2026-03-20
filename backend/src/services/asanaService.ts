import axios, { AxiosInstance } from 'axios';
import { config } from '../config/env';
import Integration, { IIntegration } from '../models/Integration';
import ActionItem, { IActionItem } from '../models/ActionItem';
import Meeting from '../models/Meeting';

const ASANA_CLIENT_ID = process.env.ASANA_CLIENT_ID || '';
const ASANA_CLIENT_SECRET = process.env.ASANA_CLIENT_SECRET || '';
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${config.PORT}/api`;

export function getAsanaOAuthURL(teamId: string, userId: string): string {
  const state = `${teamId}:${userId}`;
  const params = new URLSearchParams({
    client_id: ASANA_CLIENT_ID,
    redirect_uri: `${BACKEND_URL}/integrations/asana/callback`,
    response_type: 'code',
    state,
  });
  return `https://app.asana.com/-/oauth_authorize?${params.toString()}`;
}

export async function exchangeAsanaCode(
  code: string,
  teamId: string,
  userId: string
): Promise<IIntegration> {
  const response = await axios.post(
    'https://app.asana.com/-/oauth_token',
    new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: ASANA_CLIENT_ID,
      client_secret: ASANA_CLIENT_SECRET,
      redirect_uri: `${BACKEND_URL}/integrations/asana/callback`,
      code,
    }).toString(),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }
  );

  const data = response.data;
  if (!data.access_token) {
    throw new Error('Asana OAuth failed: no access token returned');
  }

  const userInfo = await axios.get('https://app.asana.com/api/1.0/users/me', {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });

  const workspaces = userInfo.data?.data?.workspaces || [];
  const primaryWorkspace = workspaces[0];

  const integration = await Integration.findOneAndUpdate(
    { team: teamId, type: 'asana' },
    {
      team: teamId,
      type: 'asana',
      accessToken: data.access_token,
      refreshToken: data.refresh_token || '',
      externalWorkspaceId: primaryWorkspace?.gid || '',
      externalWorkspaceName: primaryWorkspace?.name || 'Asana Workspace',
      connectedBy: userId,
      connectedAt: new Date(),
      settings: { autoSync: false },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return integration!;
}

async function refreshAsanaToken(integration: IIntegration): Promise<string> {
  if (!integration.refreshToken) {
    throw new Error('No refresh token available. Please reconnect Asana.');
  }

  const response = await axios.post(
    'https://app.asana.com/-/oauth_token',
    new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: ASANA_CLIENT_ID,
      client_secret: ASANA_CLIENT_SECRET,
      refresh_token: integration.refreshToken,
    }).toString(),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }
  );

  const data = response.data;
  if (!data.access_token) {
    throw new Error('Asana token refresh failed');
  }

  await Integration.findByIdAndUpdate(integration._id, {
    accessToken: data.access_token,
    ...(data.refresh_token ? { refreshToken: data.refresh_token } : {}),
  });

  return data.access_token;
}

function createAsanaClient(token: string): AxiosInstance {
  return axios.create({
    baseURL: 'https://app.asana.com/api/1.0',
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function asanaRequest(
  integration: IIntegration,
  fn: (client: AxiosInstance) => Promise<any>
): Promise<any> {
  const client = createAsanaClient(integration.accessToken);
  try {
    return await fn(client);
  } catch (error: any) {
    if (error.response?.status === 401 && integration.refreshToken) {
      const newToken = await refreshAsanaToken(integration);
      const retryClient = createAsanaClient(newToken);
      return fn(retryClient);
    }
    throw error;
  }
}

export async function syncActionItemToAsana(
  integration: IIntegration,
  actionItem: IActionItem
): Promise<string> {
  const projectId = integration.settings.projectId;

  if (!projectId) {
    throw new Error('No Asana project configured. Update integration settings.');
  }

  let meetingTitle = 'Unknown Meeting';
  if (actionItem.meeting) {
    const meeting = await Meeting.findById(actionItem.meeting);
    if (meeting) meetingTitle = meeting.title;
  }

  const notes = [
    actionItem.description || '',
    '',
    `Meeting: ${meetingTitle}`,
    `Priority: ${actionItem.priority}`,
  ].join('\n');

  const taskData: Record<string, any> = {
    data: {
      name: actionItem.title,
      notes,
      projects: [projectId],
    },
  };

  if (actionItem.deadline) {
    taskData.data.due_on = new Date(actionItem.deadline).toISOString().split('T')[0];
  }

  const result = await asanaRequest(integration, (client) =>
    client.post('/tasks', taskData)
  );

  const externalId = result.data?.data?.gid || '';

  await ActionItem.findByIdAndUpdate(actionItem._id, {
    $push: {
      syncedTo: {
        platform: 'asana',
        externalId,
        syncedAt: new Date(),
      },
    },
  });

  return externalId;
}

export async function fetchAsanaProjects(
  integration: IIntegration
): Promise<{ id: string; name: string }[]> {
  const workspaceId = integration.externalWorkspaceId;
  if (!workspaceId) {
    throw new Error('No Asana workspace associated with this integration');
  }

  const result = await asanaRequest(integration, (client) =>
    client.get('/projects', {
      params: { workspace: workspaceId, opt_fields: 'name,archived', limit: 100 },
    })
  );

  const projects = result.data?.data || [];
  return projects
    .filter((p: any) => !p.archived)
    .map((p: any) => ({ id: p.gid, name: p.name }));
}
