import { WebClient } from '@slack/web-api';
import { config } from '../config/env';
import Integration, { IIntegration } from '../models/Integration';
import ActionItem, { IActionItem } from '../models/ActionItem';
import Meeting from '../models/Meeting';

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID || '';
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET || '';
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${config.PORT}/api`;

export function getSlackOAuthURL(teamId: string, userId: string): string {
  const state = `${teamId}:${userId}`;
  const params = new URLSearchParams({
    client_id: SLACK_CLIENT_ID,
    scope: 'chat:write,channels:read,users:read',
    redirect_uri: `${BACKEND_URL}/integrations/slack/callback`,
    state,
  });
  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

export async function exchangeSlackCode(
  code: string,
  teamId: string,
  userId: string
): Promise<IIntegration> {
  const client = new WebClient();
  const result = await client.oauth.v2.access({
    client_id: SLACK_CLIENT_ID,
    client_secret: SLACK_CLIENT_SECRET,
    code,
    redirect_uri: `${BACKEND_URL}/integrations/slack/callback`,
  });

  if (!result.ok || !result.access_token) {
    throw new Error(`Slack OAuth failed: ${result.error || 'Unknown error'}`);
  }

  const integration = await Integration.findOneAndUpdate(
    { team: teamId, type: 'slack' },
    {
      team: teamId,
      type: 'slack',
      accessToken: result.access_token,
      externalWorkspaceId: result.team?.id || '',
      externalWorkspaceName: result.team?.name || 'Slack Workspace',
      connectedBy: userId,
      connectedAt: new Date(),
      settings: { autoSync: false },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return integration!;
}

export async function syncActionItemToSlack(
  integration: IIntegration,
  actionItem: IActionItem
): Promise<string> {
  const client = new WebClient(integration.accessToken);
  const channelId = integration.settings.channelId;

  if (!channelId) {
    throw new Error('No Slack channel configured. Update integration settings.');
  }

  let meetingTitle = 'Unknown Meeting';
  if (actionItem.meeting) {
    const meeting = await Meeting.findById(actionItem.meeting);
    if (meeting) meetingTitle = meeting.title;
  }

  const deadlineStr = actionItem.deadline
    ? new Date(actionItem.deadline).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Not set';

  const priorityEmoji =
    actionItem.priority === 'high'
      ? ':red_circle:'
      : actionItem.priority === 'medium'
        ? ':large_yellow_circle:'
        : ':large_green_circle:';

  const text = [
    `:clipboard: *New Action Item from Meeting*`,
    `*Title:* ${actionItem.title}`,
    `*Assignee:* ${actionItem.assignee || 'Unassigned'}`,
    `*Deadline:* ${deadlineStr}`,
    `*Priority:* ${priorityEmoji} ${actionItem.priority}`,
    actionItem.description ? `*Description:* ${actionItem.description}` : '',
    `*Meeting:* ${meetingTitle}`,
  ]
    .filter(Boolean)
    .join('\n');

  const result = await client.chat.postMessage({
    channel: channelId,
    text,
    mrkdwn: true,
  });

  if (!result.ok) {
    throw new Error(`Failed to post to Slack: ${result.error}`);
  }

  const externalId = result.ts || '';

  await ActionItem.findByIdAndUpdate(actionItem._id, {
    $push: {
      syncedTo: {
        platform: 'slack',
        externalId,
        syncedAt: new Date(),
      },
    },
  });

  return externalId;
}

export async function fetchSlackChannels(
  integration: IIntegration
): Promise<{ id: string; name: string }[]> {
  const client = new WebClient(integration.accessToken);
  const result = await client.conversations.list({
    types: 'public_channel,private_channel',
    limit: 200,
    exclude_archived: true,
  });

  if (!result.ok || !result.channels) {
    throw new Error('Failed to fetch Slack channels');
  }

  return result.channels
    .filter((ch) => ch.id && ch.name)
    .map((ch) => ({ id: ch.id!, name: ch.name! }));
}
