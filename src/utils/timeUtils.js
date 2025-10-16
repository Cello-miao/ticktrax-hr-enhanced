// Time utilities for consistent hour calculations across mobile
// Uses Europe/Paris timezone and Monday-start week by default

export const PARIS_TZ = 'Europe/Paris';

const fmtParis = new Intl.DateTimeFormat('fr-FR', {
  timeZone: PARIS_TZ,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  weekday: 'short'
});

function toParisParts(date) {
  const parts = fmtParis.formatToParts(date);
  const get = (t) => parts.find(p => p.type === t)?.value;
  const year = Number(get('year'));
  const month = Number(get('month'));
  const day = Number(get('day'));
  const weekday = (get('weekday') || '').toLowerCase(); // e.g., 'lun.'
  return { year, month, day, weekday };
}

function weekdayIndexMonday0(weekday) {
  const norm = weekday.replace(/\.$/, '');
  const map = { 'lun': 0, 'mar': 1, 'mer': 2, 'jeu': 3, 'ven': 4, 'sam': 5, 'dim': 6 };
  return map[norm] ?? 0;
}

function toKey({ year, month, day }) {
  return (year * 10000) + (month * 100) + day;
}

function daysInMonth(y, m) {
  return new Date(y, m, 0).getDate(); // m: 1..12
}

function getWeekStartParis(now) {
  const nowParts = toParisParts(now);
  const dow = weekdayIndexMonday0(nowParts.weekday);
  let wy = nowParts.year;
  let wm = nowParts.month;
  let wd = nowParts.day - dow;
  if (wd <= 0) {
    wm -= 1;
    if (wm <= 0) { wm = 12; wy -= 1; }
    wd = daysInMonth(wy, wm) + wd;
  }
  return { weekStart: { year: wy, month: wm, day: wd }, nowParts };
}

function getEntryTimes(entry) {
  const startTs = entry.clock_in || entry.clock_in_time || entry.start_time || entry.started_at || entry.start_date;
  const endTs = entry.clock_out || entry.clock_out_time || entry.end_time || entry.ended_at;
  const start = startTs ? new Date(startTs) : null;
  const end = endTs ? new Date(endTs) : null;
  return { start, end };
}

function getEntryDurationHours(entry) {
  let hours = Number(entry.duration_hours || entry.hours || 0);
  if (!isFinite(hours)) hours = 0;
  if (!hours) {
    const { start, end } = getEntryTimes(entry);
    if (start && end && end.getTime() >= start.getTime()) {
      hours = (end.getTime() - start.getTime()) / 3_600_000;
    } else if (start && !end) {
      const nowMs = Date.now();
      if (nowMs > start.getTime()) hours = (nowMs - start.getTime()) / 3_600_000;
    }
  }
  return hours || 0;
}

export function computeAggregatesFromEntries(entries, now = new Date()) {
  const list = Array.isArray(entries?.data) ? entries.data : (Array.isArray(entries) ? entries : []);
  const { weekStart, nowParts } = getWeekStartParis(now);
  const weekStartKey = toKey(weekStart);
  const curMonth = { year: nowParts.year, month: nowParts.month };

  let weekHours = 0;
  let monthHours = 0;
  let todayHours = 0;

  // Compute Paris day boundaries for "today"
  const parisOffsetHours = getParisOffsetHoursForDate(now);
  const parisMidnightUtc = Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day, 0, 0, 0) - parisOffsetHours * 3600000;
  const parisTomorrowMidnightUtc = parisMidnightUtc + 24 * 3600000;

  for (const entry of list) {
    const { start, end } = getEntryTimes(entry);
    const entryRef = start || end; // classify by start if available
    if (!entryRef) continue;

    const hours = getEntryDurationHours(entry);

    const ep = toParisParts(entryRef);
    const eKey = toKey(ep);

    if (eKey >= weekStartKey) weekHours += hours;
    if (ep.year === curMonth.year && ep.month === curMonth.month) monthHours += hours;
    // Compute overlap with today's Paris day [midnight, midnight+24h)
    const startMs = start ? start.getTime() : (end ? end.getTime() : NaN);
    const endMs = end ? end.getTime() : Date.now();
    if (isFinite(startMs) && isFinite(endMs) && endMs > startMs) {
      const overlap = Math.max(0, Math.min(endMs, parisTomorrowMidnightUtc) - Math.max(startMs, parisMidnightUtc));
      if (overlap > 0) {
        todayHours += overlap / 3600000;
      }
    }
  }

  return {
    weekHours,
    monthHours,
    todayHours,
    formatHours1: (v) => `${(Number(v) || 0).toFixed(1)}h`,
    formatHours1Raw: (v) => `${(Number(v) || 0).toFixed(1)}`
  };
}

export function countDaysWorkedInMonthParis(entries, now = new Date()) {
  const list = Array.isArray(entries?.data) ? entries.data : (Array.isArray(entries) ? entries : []);
  const parts = toParisParts(now);
  const days = new Set();
  for (const e of list) {
    const { start, end } = getEntryTimes(e);
    const ref = start || end;
    if (!ref) continue;
    const ep = toParisParts(ref);
    if (ep.year === parts.year && ep.month === parts.month) {
      days.add(toKey(ep));
    }
  }
  return days.size;
}

// Helper: get Paris offset hours for a given date
function getParisOffsetHoursForDate(date) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: PARIS_TZ,
      timeZoneName: 'shortOffset',
      hour: '2-digit', minute: '2-digit'
    }).formatToParts(date);
    const tz = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT+1';
    const m = tz.match(/GMT([+\-])(\d{1,2})(?::(\d{2}))?/i);
    if (!m) return 1;
    const sign = m[1] === '-' ? -1 : 1;
    const hh = parseInt(m[2] || '0', 10);
    const mm = parseInt(m[3] || '0', 10);
    return sign * (hh + mm / 60);
  } catch (_) {
    return 1; // default Paris offset if parsing fails
  }
}

// Compute a Monday-start week histogram (Mon..Sun) of hours for the given entries in Paris TZ.
// Returns: { labels: ['Mon',...,'Sun'], hours: [h0..h6] }
export function computeWeekHistogramParis(entries, now = new Date()) {
  const list = Array.isArray(entries?.data) ? entries.data : (Array.isArray(entries) ? entries : []);
  const { weekStart } = getWeekStartParis(now);
  // Build Paris day boundaries for each day in the week
  const dayBounds = [];
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  for (let i = 0; i < 7; i++) {
    // Use midday to compute the correct DST offset for that calendar day in Paris
    const middayParisLocal = new Date(Date.UTC(weekStart.year, weekStart.month - 1, weekStart.day + i, 12, 0, 0));
    const off = getParisOffsetHoursForDate(middayParisLocal);
    const startUtcMs = Date.UTC(weekStart.year, weekStart.month - 1, weekStart.day + i, 0, 0, 0) - off * 3600000;
    // end is next day's midnight in Paris
    const nextMiddayParisLocal = new Date(Date.UTC(weekStart.year, weekStart.month - 1, weekStart.day + i + 1, 12, 0, 0));
    const offNext = getParisOffsetHoursForDate(nextMiddayParisLocal);
    const endUtcMs = Date.UTC(weekStart.year, weekStart.month - 1, weekStart.day + i + 1, 0, 0, 0) - offNext * 3600000;
    dayBounds.push({ startMs: startUtcMs, endMs: endUtcMs });
  }

  const hours = Array(7).fill(0);

  for (const e of list) {
    const { start, end } = getEntryTimes(e);
    const duration = getEntryDurationHours(e);
    const hasInterval = start && (end || true);
    const effStart = start || (end ? new Date(end) : null);
    const effEnd = end || (start ? new Date() : null);

    if (effStart && effEnd && effEnd.getTime() > effStart.getTime()) {
      const sMs = effStart.getTime();
      const eMs = effEnd.getTime();
      // Skip if completely outside the week
      if (eMs < dayBounds[0].startMs || sMs > dayBounds[6].endMs) continue;
      for (let i = 0; i < 7; i++) {
        const { startMs, endMs } = dayBounds[i];
        const overlap = Math.max(0, Math.min(eMs, endMs) - Math.max(sMs, startMs));
        if (overlap > 0) hours[i] += overlap / 3600000;
      }
      continue;
    }

    // Fallback: if we have a duration but no usable timestamps, allocate to the ref day
    if (duration > 0) {
      const ref = start || end || (e.updated_at ? new Date(e.updated_at) : (e.created_at ? new Date(e.created_at) : null));
      if (ref && isFinite(ref.getTime())) {
        const t = ref.getTime();
        for (let i = 0; i < 7; i++) {
          const { startMs, endMs } = dayBounds[i];
          if (t >= startMs && t < endMs) {
            hours[i] += duration;
            break;
          }
        }
      }
    }
  }

  return { labels, hours };
}
