import { Client } from '@notionhq/client';
import axios from 'axios';
import { config } from '../config/env';
import Integration, { IIntegration } from '../models/Integration';
import ActionItem, { IActionItem } from '../models/ActionItem';
import Meeting from '../models/Meeting';

const NOTION_CLIENT_ID = process.env.NOTION_CLIENT_ID || '';
const NOTION_CLIENT_SECRET = process.env.NOTION_CLIENT_SECRET || '';
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${config.PORT}/api`;

export function getNotionOAuthURL(teamId: string, userId: string): string {
  const state = `${teamId}:${userId}`;
  const params = new URLSearchParams({
    client_id: NOTION_CLIENT_ID,
    redirect_uri: `${BACKEND_URL}/integrations/notion/callback`,
    response_type: 'code',
    owner: 'user',
    state,
  });
  return `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
}

export async function exchangeNotionCode(
  code: string,
  teamId: string,
  userId: string
): Promise<IIntegration> {
  const credentials = Buffer.from(
    `${NOTION_CLIENT_ID}:${NOTION_CLIENT_SECRET}`
  ).toString('base64');

  const response = await axios.post(
    'https://api.notion.com/v1/oauth/token',
    {
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${BACKEND_URL}/integrations/notion/callback`,
    },
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = response.data;
  if (!data.access_token) {
    throw new Error('Notion OAuth failed: no access token returned');
  }

  const integration = await Integration.findOneAndUpdate(
    { team: teamId, type: 'notion' },
    {
      team: teamId,
      type: 'notion',
      accessToken: data.access_token,
      externalWorkspaceId: data.workspace_id || '',
      externalWorkspaceName: data.workspace_name || 'Notion Workspace',
      connectedBy: userId,
      connectedAt: new Date(),
      settings: { autoSync: false },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return integration!;
}

export async function syncActionItemToNotion(
  integration: IIntegration,
  actionItem: IActionItem
): Promise<string> {
  const notion = new Client({ auth: integration.accessToken });
  const databaseId = integration.settings.databaseId;

  if (!databaseId) {
    throw new Error('No Notion database configured. Update integration settings.');
  }

  let meetingTitle = 'Unknown Meeting';
  if (actionItem.meeting) {
    const meeting = await Meeting.findById(actionItem.meeting);
    if (meeting) meetingTitle = meeting.title;
  }

  const properties: Record<string, any> = {
    Title: {
      title: [{ text: { content: actionItem.title } }],
    },
    Assignee: {
      rich_text: [{ text: { content: actionItem.assignee || 'Unassigned' } }],
    },
    Priority: {
      select: { name: actionItem.priority },
    },
    Status: {
      select: { name: actionItem.status },
    },
    Description: {
      rich_text: [
        { text: { content: actionItem.description || '' } },
      ],
    },
    Meeting: {
      rich_text: [{ text: { content: meetingTitle } }],
    },
  };

  if (actionItem.deadline) {
    properties['Deadline'] = {
      date: { start: new Date(actionItem.deadline).toISOString().split('T')[0] },
    };
  }

  const page = await notion.pages.create({
    parent: { database_id: databaseId },
    properties,
  });

  const externalId = page.id;

  await ActionItem.findByIdAndUpdate(actionItem._id, {
    $push: {
      syncedTo: {
        platform: 'notion',
        externalId,
        syncedAt: new Date(),
      },
    },
  });

  return externalId;
}

export async function fetchNotionDatabases(
  integration: IIntegration
): Promise<{ id: string; name: string }[]> {
  const notion = new Client({ auth: integration.accessToken });

  const response = await notion.search({
    filter: { property: 'object', value: 'database' as any },
    page_size: 100,
  });

  return response.results
    .filter((r) => (r as any).object === 'database')
    .map((db: any) => {
      const titleArr = db.title || [];
      const name =
        titleArr.length > 0 ? titleArr.map((t: any) => t.plain_text).join('') : 'Untitled';
      return { id: db.id, name };
    });
}
