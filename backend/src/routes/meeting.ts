import { Router } from 'express';
import { auth } from '../middleware/auth';
import { upload } from '../config/multer';
import {
  uploadMeeting,
  saveRecording,
  listMeetings,
  getMeeting,
  updateMeeting,
  deleteMeeting,
  streamAudio,
} from '../controllers/meetingController';

const router = Router();

router.post('/upload', auth, upload.single('file'), uploadMeeting);
router.post('/record', auth, upload.single('file'), saveRecording);
router.get('/', auth, listMeetings);
router.get('/:id', auth, getMeeting);
router.put('/:id', auth, updateMeeting);
router.delete('/:id', auth, deleteMeeting);
router.get('/:id/audio', auth, streamAudio);

export default router;
