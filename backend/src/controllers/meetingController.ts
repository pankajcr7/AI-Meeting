import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import { AuthRequest } from '../middleware/auth';
import Meeting from '../models/Meeting';
import ActionItem from '../models/ActionItem';
import Team from '../models/Team';

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

async function userBelongsToTeam(userId: string, teamId: string): Promise<boolean> {
  const team = await Team.findById(teamId);
  if (!team) return false;
  return team.members.some((m) => m.user.toString() === userId);
}

export const uploadMeeting = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    ensureUploadsDir();

    if (!req.file) {
      res.status(400).json({ success: false, error: { message: 'No file uploaded', code: 'NO_FILE' } });
      return;
    }

    const activeTeam = req.user.activeTeam;
    if (!activeTeam) {
      fs.unlinkSync(req.file.path);
      res.status(400).json({ success: false, error: { message: 'No active team selected', code: 'NO_TEAM' } });
      return;
    }

    const title = req.body.title || path.parse(req.file.originalname).name;

    const meeting = await Meeting.create({
      title,
      team: activeTeam,
      uploadedBy: req.user._id,
      audioUrl: req.file.filename,
      status: 'processing',
      recordingType: 'upload',
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    });

    const populated = await Meeting.findById(meeting._id).populate('uploadedBy', 'name avatar email');

    res.status(201).json({ success: true, data: populated });
  } catch (error: any) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, error: { message: error.message, code: 'UPLOAD_FAILED' } });
  }
};

export const saveRecording = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    ensureUploadsDir();

    if (!req.file) {
      res.status(400).json({ success: false, error: { message: 'No recording data', code: 'NO_FILE' } });
      return;
    }

    const activeTeam = req.user.activeTeam;
    if (!activeTeam) {
      fs.unlinkSync(req.file.path);
      res.status(400).json({ success: false, error: { message: 'No active team selected', code: 'NO_TEAM' } });
      return;
    }

    const title = req.body.title || `Recording ${new Date().toLocaleString()}`;

    const meeting = await Meeting.create({
      title,
      team: activeTeam,
      uploadedBy: req.user._id,
      audioUrl: req.file.filename,
      status: 'processing',
      recordingType: 'browser',
      fileSize: req.file.size,
      mimeType: req.file.mimetype || 'audio/webm',
    });

    const populated = await Meeting.findById(meeting._id).populate('uploadedBy', 'name avatar email');

    res.status(201).json({ success: true, data: populated });
  } catch (error: any) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, error: { message: error.message, code: 'RECORD_FAILED' } });
  }
};

export const listMeetings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const activeTeam = req.user.activeTeam;
    if (!activeTeam) {
      res.status(400).json({ success: false, error: { message: 'No active team selected', code: 'NO_TEAM' } });
      return;
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    const [meetings, total] = await Promise.all([
      Meeting.find({ team: activeTeam })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('uploadedBy', 'name avatar email'),
      Meeting.countDocuments({ team: activeTeam }),
    ]);

    const pages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: meetings,
      pagination: { page, limit, total, pages },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message, code: 'LIST_FAILED' } });
  }
};

export const getMeeting = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const meeting = await Meeting.findById(req.params.id).populate('uploadedBy', 'name avatar email');

    if (!meeting) {
      res.status(404).json({ success: false, error: { message: 'Meeting not found', code: 'NOT_FOUND' } });
      return;
    }

    const belongs = await userBelongsToTeam(req.user._id.toString(), meeting.team.toString());
    if (!belongs) {
      res.status(403).json({ success: false, error: { message: 'Access denied', code: 'FORBIDDEN' } });
      return;
    }

    res.json({ success: true, data: meeting });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message, code: 'FETCH_FAILED' } });
  }
};

export const updateMeeting = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      res.status(404).json({ success: false, error: { message: 'Meeting not found', code: 'NOT_FOUND' } });
      return;
    }

    const belongs = await userBelongsToTeam(req.user._id.toString(), meeting.team.toString());
    if (!belongs) {
      res.status(403).json({ success: false, error: { message: 'Access denied', code: 'FORBIDDEN' } });
      return;
    }

    if (req.body.title) {
      meeting.title = req.body.title;
    }

    await meeting.save();

    const populated = await Meeting.findById(meeting._id).populate('uploadedBy', 'name avatar email');
    res.json({ success: true, data: populated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message, code: 'UPDATE_FAILED' } });
  }
};

export const deleteMeeting = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      res.status(404).json({ success: false, error: { message: 'Meeting not found', code: 'NOT_FOUND' } });
      return;
    }

    const team = await Team.findById(meeting.team);
    if (!team) {
      res.status(404).json({ success: false, error: { message: 'Team not found', code: 'NOT_FOUND' } });
      return;
    }

    const userId = req.user._id.toString();
    const isOwner = meeting.uploadedBy.toString() === userId;
    const member = team.members.find((m) => m.user.toString() === userId);
    const isAdmin = member && (member.role === 'admin' || member.role === 'owner');

    if (!isOwner && !isAdmin) {
      res.status(403).json({ success: false, error: { message: 'Only the owner or team admin can delete', code: 'FORBIDDEN' } });
      return;
    }

    if (meeting.audioUrl) {
      const filePath = path.join(UPLOADS_DIR, meeting.audioUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await ActionItem.deleteMany({ meeting: meeting._id });
    await Meeting.findByIdAndDelete(meeting._id);

    res.json({ success: true, data: { message: 'Meeting deleted' } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message, code: 'DELETE_FAILED' } });
  }
};

export const streamAudio = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      res.status(404).json({ success: false, error: { message: 'Meeting not found', code: 'NOT_FOUND' } });
      return;
    }

    const belongs = await userBelongsToTeam(req.user._id.toString(), meeting.team.toString());
    if (!belongs) {
      res.status(403).json({ success: false, error: { message: 'Access denied', code: 'FORBIDDEN' } });
      return;
    }

    if (!meeting.audioUrl) {
      res.status(404).json({ success: false, error: { message: 'No audio file', code: 'NO_AUDIO' } });
      return;
    }

    const filePath = path.join(UPLOADS_DIR, meeting.audioUrl);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ success: false, error: { message: 'Audio file not found on disk', code: 'FILE_MISSING' } });
      return;
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const mimeType = meeting.mimeType || 'audio/webm';
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const stream = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': mimeType,
      });
      stream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message, code: 'STREAM_FAILED' } });
  }
};
