import { Router } from 'express';
import { auth } from '../middleware/auth';
import {
  listIntegrations,
  disconnectIntegration,
  slackConnect,
  slackCallback,
  slackSync,
  slackUpdateSettings,
  slackChannels,
  notionConnect,
  notionCallback,
  notionSync,
  notionUpdateSettings,
  notionDatabases,
  asanaConnect,
  asanaCallback,
  asanaSync,
  asanaUpdateSettings,
  asanaProjects,
  syncAllFromMeeting,
} from '../controllers/integrationController';

const router = Router();

router.get('/', auth, listIntegrations);
router.delete('/:id', auth, disconnectIntegration);

router.get('/slack/connect', auth, slackConnect);
router.get('/slack/callback', slackCallback as any);
router.post('/slack/sync/:actionItemId', auth, slackSync);
router.put('/slack/settings', auth, slackUpdateSettings);
router.get('/slack/channels', auth, slackChannels);

router.get('/notion/connect', auth, notionConnect);
router.get('/notion/callback', notionCallback as any);
router.post('/notion/sync/:actionItemId', auth, notionSync);
router.put('/notion/settings', auth, notionUpdateSettings);
router.get('/notion/databases', auth, notionDatabases);

router.get('/asana/connect', auth, asanaConnect);
router.get('/asana/callback', asanaCallback as any);
router.post('/asana/sync/:actionItemId', auth, asanaSync);
router.put('/asana/settings', auth, asanaUpdateSettings);
router.get('/asana/projects', auth, asanaProjects);

router.post('/sync-all/:meetingId', auth, syncAllFromMeeting);

export default router;
