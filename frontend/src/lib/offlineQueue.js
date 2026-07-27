import api from "./api";

const QUEUE_KEY = "pos_offline_queue";

function readQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeQueue(q) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

async function flush() {
  const q = readQueue();
  if (!q.length) return;
  const results = await Promise.allSettled(q.map((job) => api.post(job.url, job.body)));
  const remaining = q.filter((_, i) => results[i].status === "rejected");
  writeQueue(remaining);
}

if (typeof window !== "undefined") {
  window.addEventListener("online", flush);
}

/**
 * queuedPost — wraps an api POST. If offline, the request is pushed to a
 * localStorage queue and flushed automatically when the browser reconnects.
 */
export async function queuedPost(url, body) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    const q = readQueue();
    q.push({ url, body, ts: Date.now() });
    writeQueue(q);
    return { data: null, queued: true };
  }
  return api.post(url, body);
}

export function pendingQueueCount() {
  return readQueue().length;
}

export default { queuedPost, pendingQueueCount, flush };
