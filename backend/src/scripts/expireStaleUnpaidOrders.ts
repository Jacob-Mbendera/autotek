/**
 * Manual / cron entrypoint: auto-cancel stale unpaid orders and restore stock.
 *
 * Usage:
 *   npm run jobs:expire-stale-orders
 *   STALE_UNPAID_ORDER_HOURS=24 npm run jobs:expire-stale-orders
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import connectDB from '../config/database';
import {
  expireStaleUnpaidOrders,
  getStaleUnpaidOrderMaxAgeHours,
} from '../jobs/expireStaleUnpaidOrders';

async function main(): Promise<void> {
  await connectDB();

  const maxAgeHours = getStaleUnpaidOrderMaxAgeHours();
  console.log(`Expiring unpaid pending orders older than ${maxAgeHours} hour(s)...`);

  const result = await expireStaleUnpaidOrders({ maxAgeHours });
  console.log('Done:', result);

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error('expire-stale-orders failed:', error);
  process.exit(1);
});
