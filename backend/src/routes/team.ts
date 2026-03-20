import { Router } from 'express';
import {
  createTeam,
  getTeams,
  getTeamById,
  generateInvite,
  joinTeam,
  updateTeam,
} from '../controllers/teamController';
import { auth } from '../middleware/auth';

const router = Router();

router.post('/', auth, createTeam);
router.get('/', auth, getTeams);
router.get('/:id', auth, getTeamById);
router.post('/:id/invite', auth, generateInvite);
router.post('/join/:inviteCode', auth, joinTeam);
router.put('/:id', auth, updateTeam);

export default router;
