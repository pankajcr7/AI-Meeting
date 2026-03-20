import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Integration from '../models/Integration';
import ActionItem from '../models/ActionItem';
import Meeting from '../models/Meeting';
import Team from '../models/Team';
import { config } from '../config/env';

import {
  getSlackOAuthURL,
  exchangeSlackCode,
  syncActionItemToSlack,
  fetchSlackChannels,
} from '../services/slackService';
import {
  getNotionOAuthURL,
  exchangeNotionCode,
  syncActionItemToNotion,
  fetchNotionDatabases,
} from '../services/notionService';
import {
  getAsanaOAuthURL,
  exchangeAsanaCode,
  syncActionItemToAsana,
  fetchAsanaProjects,
} from '../services/asanaService';

async function userBelongsToTeam(userId: string, teamId: string): Promise<boolean> {
  const team = await Team.findById(teamId);
  if (!team) return false;
  return team.members.some((m) => m.user.toString() === userId);
}

function parseState(state: string): { teamId: string; userId: string } {
  const [teamId, userId] = state.split(':');
  if (!teamId || !userId) throw new Error('Invalid state parameter');
  return { teamId, userId };
}

// ─── General ────────────────────────────────────────────────────────

export const listIntegrations = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const activeTeam = req.user.activeTeam;
    if (!activeTeam) {
      res.status(400).json({ success: false, error: { message: 'No active team', code: 'NO_TEAM' } });
      return;
    }

    const integrations = await Integration.find({ team: activeTeam })
      .populate('connectedBy', 'name email')
      .lean();

    const safe = integrations.map(({ accessToken, refreshToken, ...rest }) => rest);

    res.json({ success: true, data: safe });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message, code: 'LIST_FAILED' } });
  }
};

export const disconnectIntegration = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const integration = await Integration.findById(req.params.id);
    if (!integration) {
      res.status(404).json({ success: false, error: { message: 'Integration not found', code: 'NOT_FOUND' } });
      return;
    }

    const belongs = await userBelongsToTeam(req.user._id.toString(), integration.team.toString());
    if (!belongs) {
      res.status(403).json({ success: false, error: { message: 'Access denied', code: 'FORBIDDEN' } });
      return;
    }

    await Integration.findByIdAndDelete(integration._id);
    res.json({ success: true, data: { message: 'Integration disconnected' } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message, code: 'DISCONNECT_FAILED' } });
  }
};

// ─── Slack ──────────────────────────────────────────────────────────

export const slackConnect = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const teamId = req.user.activeTeam?.toString() || req.user.activeTeam;
    if (!teamId) {
      res.status(400).json({ success: false, error: { message: 'No active team', code: 'NO_TEAM' } });
      return;
    }
    const url = getSlackOAuthURL(teamId, req.user._id.toString());
    res.json({ success: true, data: { url } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message, code: 'CONNECT_FAILED' } });
  }
};

export const slackCallback = async (
  req: AuthRequest & { query: { code?: string; state?: string; error?: string } },
  res: Response
): Promise<void> => {
  try {
    if (req.query.error) {
      res.redirect(`${config.FRONTEND_URL}/settings?integration=slack&status=error&message=${encodeURIComponent(req.query.error)}`);
      return;
    }

    const { code, state } = req.query;
    if (!code || !state) {
      res.redirect(`${config.FRONTEND_URL}/settings?integration=slack&status=error&message=Missing+code+or+state`);
      return;
    }

    const { teamId, userId } = parseState(state);
    await exchangeSlackCode(code, teamId, userId);

    res.redirect(`${config.FRONTEND_URL}/settings?integration=slack&status=success`);
  } catch (error: any) {
    res.redirect(`${config.FRONTEND_URL}/settings?integration=slack&status=error&message=${encodeURIComponent(error.message)}`);
  }
};

export const slackSync = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const actionItem = await ActionItem.findById(req.params.actionItemId);
    if (!actionItem) {
      res.status(404).json({ success: false, error: { message: 'Action item not found', code: 'NOT_FOUND' } });
      return;
    }

    const belongs = await userBelongsToTeam(req.user._id.toString(), actionItem.team.toString());
    if (!belongs) {
      res.status(403).json({ success: false, error: { message: 'Access denied', code: 'FORBIDDEN' } });
      return;
    }

    const integration = await Integration.findOne({ team: actionItem.team, type: 'slack' });
    if (!integration) {
      res.status(404).json({ success: false, error: { message: 'Slack not connected', code: 'NOT_CONNECTED' } });
      return;
    }

    const externalId = await syncActionItemToSlack(integration, actionItem);
    res.json({ success: true, data: { externalId, platform: 'slack' } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message, code: 'SYNC_FAILED' } });
  }
};

export const slackUpdateSettings = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const activeTeam = req.user.activeTeam;
    if (!activeTeam) {
      res.status(400).json({ success: false, error: { message: 'No active team', code: 'NO_TEAM' } });
      return;
    }

    const integration = await Integration.findOne({ team: activeTeam, type: 'slack' });
    if (!integration) {
      res.status(404).json({ success: false, error: { message: 'Slack not connected', code: 'NOT_CONNECTED' } });
      return;
    }

    const { channelId, autoSync } = req.body;
    if (channelId !== undefined) integration.settings.channelId = channelId;
    if (autoSync !== undefined) integration.settings.autoSync = autoSync;
    await integration.save();

    const { accessToken, refreshToken, ...safe } = integration.toObject();
    res.json({ success: true, data: safe });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message, code: 'UPDATE_FAILED' } });
  }
};

export const slackChannels = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const activeTeam = req.user.activeTeam;
    if (!activeTeam) {
      res.status(400).json({ success: false, error: { message: 'No active team', code: 'NO_TEAM' } });
      return;
    }

    const integration = await Integration.findOne({ team: activeTeam, type: 'slack' });
    if (!integration) {
      res.status(404).json({ success: false, error: { message: 'Slack not connected', code: 'NOT_CONNECTED' } });
      return;
    }

    const channels = await fetchSlackChannels(integration);
    res.json({ success: true, data: channels });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message, code: 'FETCH_FAILED' } });
  }
};

// ─── Notion ─────────────────────────────────────────────────────────

export const notionConnect = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const teamId = req.user.activeTeam?.toString() || req.user.activeTeam;
    if (!teamId) {
      res.status(400).json({ success: false, error: { message: 'No active team', code: 'NO_TEAM' } });
      return;
    }
    const url = getNotionOAuthURL(teamId, req.user._id.toString());
    res.json({ success: true, data: { url } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message, code: 'CONNECT_FAILED' } });
  }
};

export const notionCallback = async (
  req: AuthRequest & { query: { code?: string; state?: string; error?: string } },
  res: Response
): Promise<void> => {
  try {
    if (req.query.error) {
      res.redirect(`${config.FRONTEND_URL}/settings?integration=notion&status=error&message=${encodeURIComponent(req.query.error)}`);
      return;
    }

    const { code, state } = req.query;
    if (!code || !state) {
      res.redirect(`${config.FRONTEND_URL}/settings?integration=notion&status=error&message=Missing+code+or+state`);
      return;
    }

    const { teamId, userId } = parseState(state);
    await exchangeNotionCode(code, teamId, userId);

    res.redirect(`${config.FRONTEND_URL}/settings?integration=notion&status=success`);
  } catch (error: any) {
    res.redirect(`${config.FRONTEND_URL}/settings?integration=notion&status=error&message=${encodeURIComponent(error.message)}`);
  }
};

export const notionSync = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const actionItem = await ActionItem.findById(req.params.actionItemId);
    if (!actionItem) {
      res.status(404).json({ success: false, error: { message: 'Action item not found', code: 'NOT_FOUND' } });
      return;
    }

    const belongs = await userBelongsToTeam(req.user._id.toString(), actionItem.team.toString());
    if (!belongs) {
      res.status(403).json({ success: false, error: { message: 'Access denied', code: 'FORBIDDEN' } });
      return;
    }

    const integration = await Integration.findOne({ team: actionItem.team, type: 'notion' });
    if (!integration) {
      res.status(404).json({ success: false, error: { message: 'Notion not connected', code: 'NOT_CONNECTED' } });
      return;
    }

    const externalId = await syncActionItemToNotion(integration, actionItem);
    res.json({ success: true, data: { externalId, platform: 'notion' } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message, code: 'SYNC_FAILED' } });
  }
};

export const notionUpdateSettings = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const activeTeam = req.user.activeTeam;
    if (!activeTeam) {
      res.status(400).json({ success: false, error: { message: 'No active team', code: 'NO_TEAM' } });
      return;
    }

    const integration = await Integration.findOne({ team: activeTeam, type: 'notion' });
    if (!integration) {
      res.status(404).json({ success: false, error: { message: 'Notion not connected', code: 'NOT_CONNECTED' } });
      return;
    }

    const { databaseId, autoSync } = req.body;
    if (databaseId !== undefined) integration.settings.databaseId = databaseId;
    if (autoSync !== undefined) integration.settings.autoSync = autoSync;
    await integration.save();

    const { accessToken, refreshToken, ...safe } = integration.toObject();
    res.json({ success: true, data: safe });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message, code: 'UPDATE_FAILED' } });
  }
};

export const notionDatabases = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const activeTeam = req.user.activeTeam;
    if (!activeTeam) {
      res.status(400).json({ success: false, error: { message: 'No active team', code: 'NO_TEAM' } });
      return;
    }

    const integration = await Integration.findOne({ team: activeTeam, type: 'notion' });
    if (!integration) {
      res.status(404).json({ success: false, error: { message: 'Notion not connected', code: 'NOT_CONNECTED' } });
      return;
    }

    const databases = await fetchNotionDatabases(integration);
    res.json({ success: true, data: databases });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message, code: 'FETCH_FAILED' } });
  }
};

// ─── Asana ──────────────────────────────────────────────────────────

export const asanaConnect = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const teamId = req.user.activeTeam?.toString() || req.user.activeTeam;
    if (!teamId) {
      res.status(400).json({ success: false, error: { message: 'No active team', code: 'NO_TEAM' } });
      return;
    }
    const url = getAsanaOAuthURL(teamId, req.user._id.toString());
    res.json({ success: true, data: { url } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message, code: 'CONNECT_FAILED' } });
  }
};

export const asanaCallback = async (
  req: AuthRequest & { query: { code?: string; state?: string; error?: string } },
  res: Response
): Promise<void> => {
  try {
    if (req.query.error) {
      res.redirect(`${config.FRONTEND_URL}/settings?integration=asana&status=error&message=${encodeURIComponent(req.query.error)}`);
      return;
    }

    const { code, state } = req.query;
    if (!code || !state) {
      res.redirect(`${config.FRONTEND_URL}/settings?integration=asana&status=error&message=Missing+code+or+state`);
      return;
    }

    const { teamId, userId } = parseState(state);
    await exchangeAsanaCode(code, teamId, userId);

    res.redirect(`${config.FRONTEND_URL}/settings?integration=asana&status=success`);
  } catch (error: any) {
    res.redirect(`${config.FRONTEND_URL}/settings?integration=asana&status=error&message=${encodeURIComponent(error.message)}`);
  }
};

export const asanaSync = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const actionItem = await ActionItem.findById(req.params.actionItemId);
    if (!actionItem) {
      res.status(404).json({ success: false, error: { message: 'Action item not found', code: 'NOT_FOUND' } });
      return;
    }

    const belongs = await userBelongsToTeam(req.user._id.toString(), actionItem.team.toString());
    if (!belongs) {
      res.status(403).json({ success: false, error: { message: 'Access denied', code: 'FORBIDDEN' } });
      return;
    }

    const integration = await Integration.findOne({ team: actionItem.team, type: 'asana' });
    if (!integration) {
      res.status(404).json({ success: false, error: { message: 'Asana not connected', code: 'NOT_CONNECTED' } });
      return;
    }

    const externalId = await syncActionItemToAsana(integration, actionItem);
    res.json({ success: true, data: { externalId, platform: 'asana' } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message, code: 'SYNC_FAILED' } });
  }
};

export const asanaUpdateSettings = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const activeTeam = req.user.activeTeam;
    if (!activeTeam) {
      res.status(400).json({ success: false, error: { message: 'No active team', code: 'NO_TEAM' } });
      return;
    }

    const integration = await Integration.findOne({ team: activeTeam, type: 'asana' });
    if (!integration) {
      res.status(404).json({ success: false, error: { message: 'Asana not connected', code: 'NOT_CONNECTED' } });
      return;
    }

    const { projectId, autoSync } = req.body;
    if (projectId !== undefined) integration.settings.projectId = projectId;
    if (autoSync !== undefined) integration.settings.autoSync = autoSync;
    await integration.save();

    const { accessToken, refreshToken, ...safe } = integration.toObject();
    res.json({ success: true, data: safe });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message, code: 'UPDATE_FAILED' } });
  }
};

export const asanaProjects = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const activeTeam = req.user.activeTeam;
    if (!activeTeam) {
      res.status(400).json({ success: false, error: { message: 'No active team', code: 'NO_TEAM' } });
      return;
    }

    const integration = await Integration.findOne({ team: activeTeam, type: 'asana' });
    if (!integration) {
      res.status(404).json({ success: false, error: { message: 'Asana not connected', code: 'NOT_CONNECTED' } });
      return;
    }

    const projects = await fetchAsanaProjects(integration);
    res.json({ success: true, data: projects });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message, code: 'FETCH_FAILED' } });
  }
};

// ─── Bulk Sync ──────────────────────────────────────────────────────

export const syncAllFromMeeting = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const meetingId = req.params.meetingId;
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      res.status(404).json({ success: false, error: { message: 'Meeting not found', code: 'NOT_FOUND' } });
      return;
    }

    const belongs = await userBelongsToTeam(req.user._id.toString(), meeting.team.toString());
    if (!belongs) {
      res.status(403).json({ success: false, error: { message: 'Access denied', code: 'FORBIDDEN' } });
      return;
    }

    const actionItems = await ActionItem.find({ meeting: meetingId });
    const integrations = await Integration.find({ team: meeting.team });

    if (integrations.length === 0) {
      res.status(400).json({ success: false, error: { message: 'No integrations connected', code: 'NO_INTEGRATIONS' } });
      return;
    }

    const results: { actionItemId: string; platform: string; success: boolean; externalId?: string; error?: string }[] = [];

    for (const item of actionItems) {
      for (const integration of integrations) {
        const alreadySynced = item.syncedTo.some(
          (s) => s.platform === integration.type
        );
        if (alreadySynced) {
          results.push({ actionItemId: item._id.toString(), platform: integration.type, success: true, externalId: 'already_synced' });
          continue;
        }

        try {
          let externalId = '';
          if (integration.type === 'slack') {
            externalId = await syncActionItemToSlack(integration, item);
          } else if (integration.type === 'notion') {
            externalId = await syncActionItemToNotion(integration, item);
          } else if (integration.type === 'asana') {
            externalId = await syncActionItemToAsana(integration, item);
          }
          results.push({ actionItemId: item._id.toString(), platform: integration.type, success: true, externalId });
        } catch (error: any) {
          results.push({ actionItemId: item._id.toString(), platform: integration.type, success: false, error: error.message });
        }
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    res.json({
      success: true,
      data: { synced: successCount, failed: failCount, details: results },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message, code: 'SYNC_ALL_FAILED' } });
  }
};
