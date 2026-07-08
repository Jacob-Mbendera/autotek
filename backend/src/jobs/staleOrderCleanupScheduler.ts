import {
  expireStaleUnpaidOrders,
  isStaleOrderCleanupEnabled,
} from './expireStaleUnpaidOrders';
import { log } from '../utils/logger';

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const STARTUP_DELAY_MS = 60 * 1000; // 1 minute after server boot

function getCleanupIntervalMs(): number {
  const parsed = Number(process.env.STALE_ORDER_CLEANUP_INTERVAL_MS);
  if (!Number.isFinite(parsed) || parsed < 60_000) {
    return DEFAULT_INTERVAL_MS;
  }
  return Math.floor(parsed);
}

let intervalHandle: ReturnType<typeof setInterval> | null = null;
let startupHandle: ReturnType<typeof setTimeout> | null = null;

async function runCleanupJob(): Promise<void> {
  try {
    await expireStaleUnpaidOrders();
  } catch (error) {
    log.error('Stale order cleanup job failed', { error });
  }
}

/** Start periodic cleanup of unpaid orders (BR-13). No-op when disabled via env. */
export function startStaleOrderCleanupScheduler(): void {
  if (!isStaleOrderCleanupEnabled()) {
    log.info('Stale unpaid order cleanup is disabled (STALE_ORDER_CLEANUP_ENABLED=false)');
    return;
  }

  const intervalMs = getCleanupIntervalMs();
  log.info('Stale unpaid order cleanup scheduler started', {
    intervalMs,
    startupDelayMs: STARTUP_DELAY_MS,
  });

  startupHandle = setTimeout(() => {
    void runCleanupJob();
    intervalHandle = setInterval(() => {
      void runCleanupJob();
    }, intervalMs);
  }, STARTUP_DELAY_MS);
}

export function stopStaleOrderCleanupScheduler(): void {
  if (startupHandle) {
    clearTimeout(startupHandle);
    startupHandle = null;
  }
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
