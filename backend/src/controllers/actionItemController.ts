import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import ActionItem from '../models/ActionItem';
import Meeting from '../models/Meeting';
import Team from '../models/Team';

async function userBelongsToTeam(
  userId: string,
  teamId: string
): Promise<boolean> {
  const team = await Team.findById(teamId);
  if (!team) return false;
  return team.members.some((m) => m.user.toString() === userId);
}

export const listActionItems = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const activeTeam = req.user.activeTeam;
    if (!activeTeam) {
      res.status(400).json({
        success: false,
        error: { message: 'No active team selected', code: 'NO_TEAM' },
      });
      return;
    }

    const filter: any = { team: activeTeam };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.assignee) filter.assignee = req.query.assignee;
    if (req.query.meeting) filter.meeting = req.query.meeting;

    const sort: any = {};
    if (req.query.sortBy === 'priority') {
      sort.priority = 1;
    } else if (req.query.sortBy === 'deadline') {
      sort.deadline = 1;
    } else {
      sort.createdAt = -1;
    }

    const items = await ActionItem.find(filter)
      .sort(sort)
      .populate('meeting', 'title')
      .lean();

    res.json({ success: true, data: items });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { message: error.message, code: 'LIST_FAILED' },
    });
  }
};

export const listActionItemsByMeeting = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      res.status(404).json({
        success: false,
        error: { message: 'Meeting not found', code: 'NOT_FOUND' },
      });
      return;
    }

    const belongs = await userBelongsToTeam(
      req.user._id.toString(),
      meeting.team.toString()
    );
    if (!belongs) {
      res.status(403).json({
        success: false,
        error: { message: 'Access denied', code: 'FORBIDDEN' },
      });
      return;
    }

    const items = await ActionItem.find({ meeting: meeting._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: items });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { message: error.message, code: 'LIST_FAILED' },
    });
  }
};

export const createActionItem = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const activeTeam = req.user.activeTeam;
    if (!activeTeam) {
      res.status(400).json({
        success: false,
        error: { message: 'No active team selected', code: 'NO_TEAM' },
      });
      return;
    }

    const { title, description, assignee, deadline, priority, meeting } =
      req.body;

    if (!title) {
      res.status(400).json({
        success: false,
        error: { message: 'Title is required', code: 'VALIDATION' },
      });
      return;
    }

    if (meeting) {
      const meetingDoc = await Meeting.findById(meeting);
      if (!meetingDoc) {
        res.status(404).json({
          success: false,
          error: { message: 'Meeting not found', code: 'NOT_FOUND' },
        });
        return;
      }
      const belongs = await userBelongsToTeam(
        req.user._id.toString(),
        meetingDoc.team.toString()
      );
      if (!belongs) {
        res.status(403).json({
          success: false,
          error: { message: 'Access denied', code: 'FORBIDDEN' },
        });
        return;
      }
    }

    const item = await ActionItem.create({
      meeting: meeting || undefined,
      team: activeTeam,
      title,
      description: description || '',
      assignee: assignee || 'Unassigned',
      deadline: deadline ? new Date(deadline) : undefined,
      priority: priority || 'medium',
      status: 'pending',
    });

    res.status(201).json({ success: true, data: item });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { message: error.message, code: 'CREATE_FAILED' },
    });
  }
};

export const updateActionItem = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const item = await ActionItem.findById(req.params.id);
    if (!item) {
      res.status(404).json({
        success: false,
        error: { message: 'Action item not found', code: 'NOT_FOUND' },
      });
      return;
    }

    const belongs = await userBelongsToTeam(
      req.user._id.toString(),
      item.team.toString()
    );
    if (!belongs) {
      res.status(403).json({
        success: false,
        error: { message: 'Access denied', code: 'FORBIDDEN' },
      });
      return;
    }

    const { title, description, assignee, deadline, priority, status } =
      req.body;

    if (title !== undefined) item.title = title;
    if (description !== undefined) item.description = description;
    if (assignee !== undefined) item.assignee = assignee;
    if (deadline !== undefined)
      item.deadline = deadline ? new Date(deadline) : undefined;
    if (priority !== undefined) item.priority = priority;
    if (status !== undefined) item.status = status;

    await item.save();

    res.json({ success: true, data: item });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { message: error.message, code: 'UPDATE_FAILED' },
    });
  }
};

export const deleteActionItem = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const item = await ActionItem.findById(req.params.id);
    if (!item) {
      res.status(404).json({
        success: false,
        error: { message: 'Action item not found', code: 'NOT_FOUND' },
      });
      return;
    }

    const belongs = await userBelongsToTeam(
      req.user._id.toString(),
      item.team.toString()
    );
    if (!belongs) {
      res.status(403).json({
        success: false,
        error: { message: 'Access denied', code: 'FORBIDDEN' },
      });
      return;
    }

    await ActionItem.findByIdAndDelete(item._id);

    res.json({ success: true, data: { message: 'Action item deleted' } });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { message: error.message, code: 'DELETE_FAILED' },
    });
  }
};

export const bulkUpdateActionItems = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { ids, status } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({
        success: false,
        error: { message: 'ids array is required', code: 'VALIDATION' },
      });
      return;
    }

    if (!status || !['pending', 'in-progress', 'completed'].includes(status)) {
      res.status(400).json({
        success: false,
        error: { message: 'Valid status is required', code: 'VALIDATION' },
      });
      return;
    }

    const activeTeam = req.user.activeTeam;
    if (!activeTeam) {
      res.status(400).json({
        success: false,
        error: { message: 'No active team selected', code: 'NO_TEAM' },
      });
      return;
    }

    await ActionItem.updateMany(
      { _id: { $in: ids }, team: activeTeam },
      { $set: { status, updatedAt: new Date() } }
    );

    res.json({ success: true, data: { message: 'Action items updated' } });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { message: error.message, code: 'BULK_UPDATE_FAILED' },
    });
  }
};
