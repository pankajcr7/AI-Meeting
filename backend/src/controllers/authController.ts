import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import authService from '../services/authService';
import User from '../models/User';
import { config } from '../config/env';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' as const : 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ message: 'Name, email, and password are required' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ message: 'Password must be at least 6 characters' });
      return;
    }

    const { user, token } = await authService.register({ name, email, password });

    res.cookie('token', token, COOKIE_OPTIONS);
    res.status(201).json({ user, token });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    const { user, token } = await authService.login({ email, password });

    res.cookie('token', token, COOKIE_OPTIONS);
    res.json({ user, token });
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  _req: Request,
  res: Response
): Promise<void> => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
};

export const getMe = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('teams')
      .populate('activeTeam');

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, avatar } = req.body;
    const updates: any = {};

    if (name) updates.name = name;
    if (avatar) updates.avatar = avatar;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true }
    ).select('-password');

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
};

export const switchActiveTeam = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { teamId } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const isMember = user.teams.some(
      (t: any) => t.toString() === teamId
    );

    if (!isMember) {
      res.status(403).json({ message: 'You are not a member of this team' });
      return;
    }

    user.activeTeam = teamId;
    await user.save();

    const updatedUser = await User.findById(user._id)
      .select('-password')
      .populate('teams')
      .populate('activeTeam');

    res.json({ user: updatedUser });
  } catch (error) {
    next(error);
  }
};

export const googleCallback = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.redirect(`${config.FRONTEND_URL}/login?error=auth_failed`);
      return;
    }

    const { token } = await authService.findOrCreateGoogleUser({
      googleId: user.googleId || user.id,
      email: user.email || user.emails?.[0]?.value,
      name: user.displayName || user.name?.givenName || 'User',
      avatar: user.photos?.[0]?.value,
    });

    res.cookie('token', token, COOKIE_OPTIONS);
    res.redirect(`${config.FRONTEND_URL}/dashboard?token=${token}`);
  } catch (error) {
    res.redirect(`${config.FRONTEND_URL}/login?error=auth_failed`);
  }
};
