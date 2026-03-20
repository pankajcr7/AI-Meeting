import User, { IUser } from '../models/User';
import Team from '../models/Team';
import { signToken } from '../utils/jwt';
import crypto from 'crypto';

interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

export class AuthService {
  async register({ name, email, password }: RegisterInput) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw Object.assign(new Error('Email already registered'), { statusCode: 400 });
    }

    const user = await User.create({ name, email, password });

    const team = await Team.create({
      name: 'My Workspace',
      owner: user._id,
      members: [{ user: user._id, role: 'owner', joinedAt: new Date() }],
      inviteCode: crypto.randomBytes(8).toString('hex'),
    });

    user.teams = [team._id as any];
    user.activeTeam = team._id as any;
    await user.save();

    const token = signToken({ userId: (user._id as any).toString(), email: user.email });
    const userObj = user.toObject();
    delete userObj.password;

    return { user: userObj, token };
  }

  async login({ email, password }: LoginInput) {
    const user = await User.findOne({ email });
    if (!user) {
      throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
    }

    if (!user.password) {
      throw Object.assign(new Error('Please login with Google'), { statusCode: 401 });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
    }

    const token = signToken({ userId: (user._id as any).toString(), email: user.email });
    const userObj = user.toObject();
    delete userObj.password;

    return { user: userObj, token };
  }

  async findOrCreateGoogleUser(profile: {
    googleId: string;
    email: string;
    name: string;
    avatar?: string;
  }) {
    let user = await User.findOne({ googleId: profile.googleId });

    if (!user) {
      user = await User.findOne({ email: profile.email });

      if (user) {
        user.googleId = profile.googleId;
        if (!user.avatar && profile.avatar) {
          user.avatar = profile.avatar;
        }
        await user.save();
      } else {
        user = await User.create({
          email: profile.email,
          name: profile.name,
          googleId: profile.googleId,
          avatar: profile.avatar,
        });

        const team = await Team.create({
          name: 'My Workspace',
          owner: user._id,
          members: [{ user: user._id, role: 'owner', joinedAt: new Date() }],
          inviteCode: crypto.randomBytes(8).toString('hex'),
        });

        user.teams = [team._id as any];
        user.activeTeam = team._id as any;
        await user.save();
      }
    }

    const token = signToken({ userId: (user._id as any).toString(), email: user.email });
    const userObj = user.toObject();
    delete userObj.password;

    return { user: userObj, token };
  }
}

export default new AuthService();
