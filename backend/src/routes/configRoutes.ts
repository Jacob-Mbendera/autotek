import { Router } from 'express';
import { getBankTransferDetails } from '../controllers/configController';

const router = Router();

router.get('/bank-transfer', getBankTransferDetails);

export default router;
