const DEBOUNCE_MS = Number(process.env.PROGRESS_SAVE_MS) || 4000;

type PendingJob = {
  fn: () => Promise<void>;
  timeout: ReturnType<typeof setTimeout>;
};

const pending = new Map<string, PendingJob>();

export function queueProgressSave(attemptId: string, save: () => Promise<void>) {
  const existing = pending.get(attemptId);
  if (existing) clearTimeout(existing.timeout);

  const timeout = setTimeout(async () => {
    const job = pending.get(attemptId);
    if (!job) return;
    pending.delete(attemptId);
    try {
      await job.fn();
    } catch (err) {
      console.error(`[progress] save failed for ${attemptId}`, err);
    }
  }, DEBOUNCE_MS);

  pending.set(attemptId, { fn: save, timeout });
}

export async function flushProgressSave(attemptId: string) {
  const job = pending.get(attemptId);
  if (!job) return;
  clearTimeout(job.timeout);
  pending.delete(attemptId);
  await job.fn();
}

export async function flushAllProgress() {
  const ids = [...pending.keys()];
  await Promise.all(ids.map((id) => flushProgressSave(id)));
}
