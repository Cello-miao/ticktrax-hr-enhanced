// FIFO offline action queue using localStorage strings
// Stores JSON stringified actions in a list and flushes when back online.
import { apiService } from '../apiService.js';
import { setPendingLocalStatus, setCachedTimeStatus, upsertTimeEntries } from './offlineService.js';

const STORAGE_KEY = 'offline.queue.v1';
// Load the queue from localStorage
function loadQueue() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (_) {
    return [];
  }
}

// Save the queue to localStorage
function saveQueue(queue) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (_) {}
}

// Enqueue a new offline action
export function enqueueAction(action) {
  // action: { type: string, endpoint?: string, method?: 'POST'|'PUT'|'DELETE'|'PATCH', payload?: any, meta?: any }
  const q = loadQueue();
  q.push({ ...action, enqueued_at: Date.now() });
  saveQueue(q);

  // Optimistically set local pending status for clock actions
  if (action?.type === 'CLOCK_IN' || action?.type === 'CLOCK_OUT') {
    try { setPendingLocalStatus(action.type); } catch (_) {}
  }
}

// Dequeue the oldest action
export function dequeueAction() {
  const q = loadQueue();
  const item = q.shift();
  saveQueue(q);
  return item;
}

// Peek at the current queue without modifying it
export function peekQueue() {
  return loadQueue();
}

// Clear the entire queue
export function clearQueue() {
  saveQueue([]);
}

// Flush the offline action queue by executing each action in order.
export async function flushQueue({ showSpinner = true } = {}) {
  // Spinner via cordova-plugin-progress-indicator
  const spinner = getSpinner();
  if (showSpinner) spinner.show();

  let processed = 0;
  try {
    while (true) {
      const item = dequeueAction();
      if (!item) break;
      await executeAction(item);
      processed++;
    }
    if (showSpinner) spinner.hide();
    return { ok: true, processed };
  } catch (err) {
    // On any error: stop, and advise caller to reload data from server
    if (showSpinner) spinner.hide();
    return { ok: false, processed, error: err };
  }
}

// Execute a single offline action item
async function executeAction(item) {
  const { type, payload, endpoint, method } = item || {};
  // Map known types to apiService calls; fall back to generic request
  if (type === 'CLOCK_IN') {
    const res = await apiService.clockIn(payload || {});
    // Refresh cached status after successful mutation
    try {
      const fresh = await apiService.getTimeStatus();
      const data = fresh?.data ?? fresh ?? {};
      setCachedTimeStatus(data);
      // Also refresh recent entries cache best-effort
      try {
        const entriesRes = await apiService.getTimeEntries({ page: 1, limit: 50 });
        const entries = Array.isArray(entriesRes?.data) ? entriesRes.data : (Array.isArray(entriesRes) ? entriesRes : []);
        upsertTimeEntries(entries);
      } catch (_) {}
    } catch (_) {}
    return res;
  }
  if (type === 'CLOCK_OUT') {
    const res = await apiService.clockOut(payload || {});
    try {
      const fresh = await apiService.getTimeStatus();
      const data = fresh?.data ?? fresh ?? {};
      setCachedTimeStatus(data);
      try {
        const entriesRes = await apiService.getTimeEntries({ page: 1, limit: 50 });
        const entries = Array.isArray(entriesRes?.data) ? entriesRes.data : (Array.isArray(entriesRes) ? entriesRes : []);
        upsertTimeEntries(entries);
      } catch (_) {}
    } catch (_) {}
    return res;
  }
  if (type === 'CREATE_TIME_ENTRY') {
    return await apiService.createManualTimeEntry(payload);
  }
  if (type === 'UPDATE_TIME_ENTRY') {
    const { entry_id, ...rest } = payload || {};
    return await apiService.updateTimeEntry(entry_id, rest);
  }
  if (type === 'DELETE_TIME_ENTRY') {
    const { entry_id } = payload || {};
    return await apiService.deleteTimeEntry(entry_id);
  }
  // Generic fallback
  if (endpoint && method) {
    return await apiService.request(endpoint, { method, body: payload ? JSON.stringify(payload) : undefined });
  }
  throw new Error('Unknown offline action');
}

function getSpinner() {
  const noop = { show: () => {}, hide: () => {} };
  try {
    if (window.ProgressIndicator && window.ProgressIndicator.showSimple && window.ProgressIndicator.hide) {
      return {
        show: () => window.ProgressIndicator.showSimple(true),
        hide: () => window.ProgressIndicator.hide()
      };
    }
    // Alternate API names sometimes seen
    if (window.ProgressIndicator && window.ProgressIndicator.show && window.ProgressIndicator.hide) {
      return {
        show: () => window.ProgressIndicator.show(true),
        hide: () => window.ProgressIndicator.hide()
      };
    }
  } catch (_) {
    return noop;
  }
  return noop;
}

// Auto-flush when back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    // Best-effort flush without blocking UI; spinner still shows
    flushQueue().then(() => {}).catch(() => {});
  });
}
