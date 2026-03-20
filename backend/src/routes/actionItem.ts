import { Router } from 'express';
import { auth } from '../middleware/auth';
import {
  listActionItems,
  listActionItemsByMeeting,
  createActionItem,
  updateActionItem,
  deleteActionItem,
  bulkUpdateActionItems,
} from '../controllers/actionItemController';

const router = Router();

router.get('/', auth, listActionItems);
router.get('/meeting/:id', auth, listActionItemsByMeeting);
router.post('/', auth, createActionItem);
router.post('/bulk-update', auth, bulkUpdateActionItems);
router.put('/:id', auth, updateActionItem);
router.delete('/:id', auth, deleteActionItem);

export default router;
