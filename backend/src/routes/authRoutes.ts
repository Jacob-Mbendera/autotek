import { Router } from 'express';
import { register, login, getMe, updateProfile, changePassword, forgotPassword, verifyResetToken, resetPassword } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateVerifyResetToken,
  validateResetPassword,
} from '../middleware/authValidation';

const router = Router();

router.post('/register', validate(validateRegister), register);
router.post('/login', validate(validateLogin), login);
router.get('/me', authMiddleware, getMe);
router.patch('/profile', authMiddleware, updateProfile);
router.patch('/password', authMiddleware, changePassword);
router.post('/forgot-password', validate(validateForgotPassword), forgotPassword);
router.post('/verify-reset-token', validate(validateVerifyResetToken), verifyResetToken);
router.post('/reset-password', validate(validateResetPassword), resetPassword);

export default router;
