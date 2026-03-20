import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import Team from '../models/Team';
import User from '../models/User';
import crypto from 'crypto';

export const createTeam = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name } = req.body;

    if (!name) {
      res.status(400).json({ message: 'Team name is required' });
      return;
    }

    const team = await Team.create({
      name,
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'owner', joinedAt: new Date() }],
      inviteCode: crypto.randomBytes(8).toString('hex'),
    });

    await User.findByIdAndUpdate(req.user._id, {
      $push: { teams: team._id },
      $set: { activeTeam: team._id },
    });

    res.status(201).json({ team });
  } catch (error) {
    next(error);
  }
};

export const getTeams = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const teams = await Team.find({
      'members.user': req.user._id,
    }).populate('members.user', 'name email avatar');

    res.json({ teams });
  } catch (error) {
    next(error);
  }
};

export const getTeamById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('members.user', 'name email avatar')
      .populate('owner', 'name email avatar');

    if (!team) {
      res.status(404).json({ message: 'Team not found' });
      return;
    }

    const isMember = team.members.some(
      (m) => m.user && (m.user as any)._id.toString() === req.user._id.toString()
    );

    if (!isMember) {
      res.status(403).json({ message: 'Not authorized to view this team' });
      return;
    }

    res.json({ team });
  } catch (error) {
    next(error);
  }
};

export const generateInvite = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      res.status(404).json({ message: 'Team not found' });
      return;
    }

    const member = team.members.find(
      (m) => m.user.toString() === req.user._id.toString()
    );

    if (!member || !['owner', 'admin'].includes(member.role)) {
      res.status(403).json({ message: 'Only owners and admins can generate invite links' });
      return;
    }

    team.inviteCode = crypto.randomBytes(8).toString('hex');
    await team.save();

    res.json({ inviteCode: team.inviteCode });
  } catch (error) {
    next(error);
  }
};

export const joinTeam = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { inviteCode } = req.params;

    const team = await Team.findOne({ inviteCode });
    if (!team) {
      res.status(404).json({ message: 'Invalid invite code' });
      return;
    }

    const alreadyMember = team.members.some(
      (m) => m.user.toString() === req.user._id.toString()
    );

    if (alreadyMember) {
      res.status(400).json({ message: 'You are already a member of this team' });
      return;
    }

    team.members.push({
      user: req.user._id,
      role: 'member',
      joinedAt: new Date(),
    });
    await team.save();

    await User.findByIdAndUpdate(req.user._id, {
      $push: { teams: team._id },
    });

    res.json({ team });
  } catch (error) {
    next(error);
  }
};

export const updateTeam = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      res.status(404).json({ message: 'Team not found' });
      return;
    }

    const member = team.members.find(
      (m) => m.user.toString() === req.user._id.toString()
    );

    if (!member || !['owner', 'admin'].includes(member.role)) {
      res.status(403).json({ message: 'Only owners and admins can update the team' });
      return;
    }

    const { name } = req.body;
    if (name) team.name = name;

    await team.save();

    const updatedTeam = await Team.findById(team._id)
      .populate('members.user', 'name email avatar')
      .populate('owner', 'name email avatar');

    res.json({ team: updatedTeam });
  } catch (error) {
    next(error);
  }
};
