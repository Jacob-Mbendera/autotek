import { Request, Response } from 'express';
import { emailService } from '../services/emailService';

export const submitContactMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, message, reason } = req.body;

    await emailService.sendContactMessage({ name, email, message, reason });

    res.json({ message: 'Your message has been sent. We will get back to you soon.' });
  } catch (error: any) {
    console.error('[Contact] Error submitting contact message:', error);
    res.status(500).json({ message: error.message || 'Failed to send message' });
  }
};
