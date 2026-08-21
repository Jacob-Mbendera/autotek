import { Request, Response } from 'express';
import crypto from 'crypto';
import User from '../models/User';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken, setAuthCookie, clearAuthCookie } from '../utils/jwt';
import { UserRole } from '../types/shared';
import { sendPasswordResetEmail } from '../utils/email';
import { emailService } from '../services/emailService';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, phone, address } = req.body;

    // Validate required fields (validation middleware should have caught these, but double-check)
    if (!email || !password || !name || !phone) {
      res.status(400).json({
        message: 'Missing required fields',
        errors: [
          !email && 'Email is required',
          !password && 'Password is required',
          !name && 'Name is required',
          !phone && 'Phone is required',
        ].filter(Boolean),
      });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: 'User with this email already exists' });
      return;
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = new User({
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      name: name.trim(),
      phone: phone.trim(),
      address: address?.trim() || undefined,
      role: UserRole.CUSTOMER,
    });

    await user.save();

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(user);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail registration if email fails
    }

    // Generate token
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    });

    setAuthCookie(res, token);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        address: user.address,
      },
    });
  } catch (error: any) {
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      res.status(400).json({ message: 'Validation failed', errors });
      return;
    }

    // Handle duplicate key error
    if (error.code === 11000) {
      res.status(400).json({ message: 'User with this email already exists' });
      return;
    }

    res.status(500).json({ message: error.message || 'Registration failed' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      res.status(400).json({
        message: 'Missing required fields',
        errors: [
          !email && 'Email is required',
          !password && 'Password is required',
        ].filter(Boolean),
      });
      return;
    }

    // Find user
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    // Check password
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ message: 'Your account has been deactivated' });
      return;
    }

    // Generate token
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    });

    setAuthCookie(res, token);

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        address: user.address,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Login failed' });
  }
};

export const getMe = async (req: any, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json({
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        address: user.address,
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to get user' });
  }
};

/**
 * Log out: clears the auth cookie and bumps tokenVersion so this token (and any
 * other token issued to this user) is invalid everywhere, not just in this browser.
 * Idempotent — always returns 200, whether or not there was a valid session.
 */
export const logout = async (req: any, res: Response): Promise<void> => {
  try {
    if (req.user) {
      await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
    }
    clearAuthCookie(res);
    res.json({ message: 'Logged out successfully' });
  } catch (error: any) {
    clearAuthCookie(res);
    res.json({ message: 'Logged out successfully' });
  }
};

export const updateProfile = async (req: any, res: Response): Promise<void> => {
  try {
    const { name, phone, address } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Update fields if provided
    if (name !== undefined) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (address !== undefined) user.address = address?.trim() || undefined;

    await user.save();

    res.json({
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        address: user.address,
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to update profile' });
  }
};

export const changePassword = async (req: any, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ message: 'Current password and new password are required' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ message: 'New password must be at least 6 characters long' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Verify current password
    const isMatch = await comparePassword(currentPassword, user.password);
    if (!isMatch) {
      res.status(401).json({ message: 'Current password is incorrect' });
      return;
    }

    // Hash and update password, bumping tokenVersion so any other token issued
    // before this change (e.g. stolen/leaked) stops working immediately.
    user.password = await hashPassword(newPassword);
    user.tokenVersion += 1;
    await user.save();

    // Re-issue a cookie with the new tokenVersion so the current session
    // that just changed its own password isn't immediately logged out too.
    const freshToken = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    });
    setAuthCookie(res, freshToken);

    res.json({ message: 'Password updated successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to change password' });
  }
};

/**
 * Request password reset - sends reset token to user's email
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ message: 'Email is required' });
      return;
    }

    // Find user by email
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    
    // Always return success message to prevent email enumeration
    // But only send email if user exists
    if (user) {
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      // Save reset token to user
      user.resetToken = resetToken;
      user.resetTokenExpiry = resetTokenExpiry;
      await user.save();

      // Send password reset email
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
      await sendPasswordResetEmail(user.email, user.name, resetUrl);
    }

    // Always return success to prevent email enumeration
    res.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error: any) {
    console.error('Error in forgotPassword:', error);
    // Still return success to prevent information leakage
    res.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  }
};

/**
 * Verify reset token
 */
export const verifyResetToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ message: 'Reset token is required' });
      return;
    }

    // Find user with matching token and valid expiry
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() }, // Token not expired
    });

    if (!user) {
      res.status(400).json({ message: 'Invalid or expired reset token' });
      return;
    }

    res.json({ message: 'Reset token is valid' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to verify reset token' });
  }
};

/**
 * Reset password using reset token
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(400).json({ message: 'Reset token and new password are required' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ message: 'New password must be at least 6 characters long' });
      return;
    }

    // Find user with matching token and valid expiry
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() }, // Token not expired
    });

    if (!user) {
      res.status(400).json({ message: 'Invalid or expired reset token' });
      return;
    }

    // Hash and update password, bumping tokenVersion so any token issued before
    // this reset (e.g. from a compromised account) stops working immediately.
    user.password = await hashPassword(newPassword);
    user.tokenVersion += 1;

    // Clear reset token
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;

    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to reset password' });
  }
};
