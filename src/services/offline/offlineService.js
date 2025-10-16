// Offline data manager: caches API responses and serves when offline
import { getCollection, saveDb } from './db.js';
import { apiService } from '../apiService.js';

function isOnline() {
  if (typeof navigator !== 'undefined' && 'onLine' in navigator) return navigator.onLine;
  return true;
}

// Time entries cache
export async function fetchTimeEntriesCached(params = { page: 1, limit: 50 }) {
  const col = getCollection('time_entries');
  if (isOnline()) {
    try {
      const res = await apiService.getTimeEntries(params);
      const entries = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      // upsert by id (fallback to generated id)
      upsertTimeEntries(entries);
      saveDb();
      return { data: entries, source: 'network' };
    } catch (_) {
      // fallthrough to cache
    }
  }
  // Offline fallback: return most recent cached entries (sorted desc by created/updated)
  const list = col.chain().simplesort('updated_at', true).data();
  return { data: list, source: 'cache' };
}

// Time status cache
export async function fetchTimeStatusCached() {
  const col = getCollection('time_status');
  if (isOnline()) {
    try {
      const res = await apiService.getTimeStatus();
      const data = res?.data ?? res ?? {};
      setCachedTimeStatus(data);
      saveDb();
      return { data, source: 'network' };
    } catch (_) {
      // fallthrough to cache
    }
  }
  const existing = col.by('id', 'current');
  return { data: existing || {}, source: 'cache' };
}

// Utility: clear caches (optional)
export function clearOfflineCaches() {
  const t = getCollection('time_entries');
  const s = getCollection('time_status');
  t.clear();
  s.clear();
  saveDb();
}

// ==================== MUTATION HELPERS ====================

/**
 * Upsert an array of time entries into the offline cache.
 * @param {Array} entries
 */
export function upsertTimeEntries(entries = []) {
  const col = getCollection('time_entries');
  entries.forEach((e, i) => {
    const id = e.id ?? `${Date.now()}_${i}`;
    const existing = col.by('id', id);
    const rec = { ...e, id };
    if (existing) {
      Object.assign(existing, rec);
      col.update(existing);
    } else {
      col.insert(rec);
    }
  });
}

/**
 * Directly set the cached current time status.
 * Adds id: 'current' and updated_at.
 */
export function setCachedTimeStatus(data = {}) {
  const col = getCollection('time_status');
  const id = 'current';
  const existing = col.by('id', id);
  const rec = { id, ...data, updated_at: new Date().toISOString() };
  if (existing) {
    Object.assign(existing, rec);
    col.update(existing);
  } else {
    col.insert(rec);
  }
}

/**
 * Set a pending local time status when queuing actions offline.
 * @param {'CLOCK_IN'|'CLOCK_OUT'} actionType
 */
export function setPendingLocalStatus(actionType, whenIso = null) {
  const ts = whenIso || new Date().toISOString();
  if (actionType === 'CLOCK_IN') {
    setCachedTimeStatus({
      is_clocked_in: true,
      status: 'clocked_in',
      clock_in_time: ts,
      started_at: ts,
      pending: true,
    });
  } else if (actionType === 'CLOCK_OUT') {
    setCachedTimeStatus({
      is_clocked_in: false,
      status: 'clocked_out',
      clock_out_time: ts,
      ended_at: ts,
      pending: true,
    });
  }
  saveDb();
}
