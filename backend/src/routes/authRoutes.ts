import { Router } from 'express';
import { register, login, logout, getMe, updateProfile, changePassword, forgotPassword, verifyResetToken, resetPassword, verifyEmail, resendVerificationEmail } from '../controllers/authController';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { authLimiter } from '../middleware/rateLimiter';
import {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateVerifyResetToken,
  validateResetPassword,
  validateVerifyEmail,
  validateResendVerification,
} from '../middleware/authValidation';

const router = Router();

// authLimiter (5 req/15min) guards only the credential-guessing-sensitive
// endpoints. It must NOT sit on the whole router: /me is called on every page
// load (see useAuthBootstrap on the frontend) and would exhaust the budget
// almost immediately, locking users out of session checks for 15 minutes.
router.post('/register', authLimiter, validate(validateRegister), register);
router.post('/login', authLimiter, validate(validateLogin), login);
router.post('/logout', optionalAuthMiddleware, logout);
router.get('/me', authMiddleware, getMe);
router.patch('/profile', authMiddleware, updateProfile);
router.patch('/password', authMiddleware, changePassword);
router.post('/forgot-password', authLimiter, validate(validateForgotPassword), forgotPassword);
router.post('/verify-reset-token', authLimiter, validate(validateVerifyResetToken), verifyResetToken);
router.post('/reset-password', authLimiter, validate(validateResetPassword), resetPassword);
router.post('/verify-email', authLimiter, validate(validateVerifyEmail), verifyEmail);
router.post('/resend-verification', authLimiter, validate(validateResendVerification), resendVerificationEmail);

export default router;
