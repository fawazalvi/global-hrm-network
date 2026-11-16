import { pollImapInbox, processEmailOutboxBatch } from '../src/backend/email/service';
import { db } from '../src/backend/db';

async function runOnce() {
  const outbox = await processEmailOutboxBatch(50);
  const imap = await pollImapInbox();
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      outbox,
      imap,
    })
  );
}

async function main() {
  const loopMode = process.argv.includes('--loop');
  const intervalSec = Math.max(30, Number(process.env.EMAIL_WORKER_INTERVAL_SEC || 60));

  if (!loopMode) {
    await runOnce();
    await db.$disconnect();
    return;
  }

  console.log(`Starting Global HRM Network Email Worker (interval: ${intervalSec}s)`);
  while (true) {
    try {
      await runOnce();
    } catch (err) {
      console.error('Email worker cycle error:', err);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalSec * 1000));
  }
}

main().catch(async (err) => {
  console.error('Fatal email worker error:', err);
  await db.$disconnect();
  process.exit(1);
});
