import { Request, Response } from 'express';

/**
 * Public bank transfer account details, shown to buyers at checkout before they pay.
 * Stored as env vars (matching the PAYCHANGU_* convention) so ops can update the
 * account without a frontend redeploy. No auth required — a guest needs this too.
 */
export const getBankTransferDetails = async (_req: Request, res: Response): Promise<void> => {
  res.json({
    bankName: process.env.BANK_TRANSFER_BANK_NAME || '',
    accountName: process.env.BANK_TRANSFER_ACCOUNT_NAME || '',
    accountNumber: process.env.BANK_TRANSFER_ACCOUNT_NUMBER || '',
    branch: process.env.BANK_TRANSFER_BRANCH || '',
  });
};
