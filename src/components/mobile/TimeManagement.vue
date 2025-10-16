<template>
  <div class="p-4">
    <h2 class="text-2xl font-bold mb-4">Time Management</h2>

    <Card class="mb-4">
      <CardContent>
        <div class="grid grid-cols-2 gap-4 text-center height_topbox" >
          <div>
            <div class="text-3xl font-bold">{{ totalHours }}</div>
            <div class="text-sm text-muted-foreground">Hours This Week</div>
          </div>
          <div>
            <div class="text-3xl font-bold">{{ todayHours }}</div>
            <div class="text-sm text-muted-foreground">Hours Today</div>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card class="mb-4">
      <CardContent>
        <h3 class="font-semibold mb-2 height_topbox2">Recent Time Entries</h3>
        <ul class="space-y-2">
          <li v-for="entry in recentEntries" :key="entry.id" class="flex justify-between">
            <div>
              <div class="font-medium">{{ entry.date }}</div>
              <div class="text-xs text-muted-foreground">{{ entry.clockIn }} — {{ entry.clockOut }}</div>
            </div>
            <div class="text-right">
              <div class="font-semibold">{{ entry.hours }}h</div>
            </div>
          </li>
        </ul>
      </CardContent>
    </Card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import Card from '../ui/card.vue';
import { CardContent } from '../ui/card-components.vue';
import Button from '../ui/button.vue';
import { apiService } from '../../services/apiService.js';
import { computeAggregatesFromEntries } from '../../utils/timeUtils.js';

const totalHours = ref('0.0');
const todayHours = ref('0.0');
const overtimeHours = ref('0.0');
const recentEntries = ref([]);
const loading = ref(false);
const error = ref('');

const requestAdjustment = () => {
  alert('Request submitted (demo)');
};

onMounted(async () => {
  await loadTimeData();
});

async function loadTimeData() {
  loading.value = true;
  error.value = '';
  try {
    // Fetch recent time entries for the current user
    const res = await apiService.getTimeEntries({ page: 1, limit: 200 });
    const entries = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);

    // Map to UI and compute hours
    const mapped = entries.map(e => mapEntry(e));
    // Sort by clockIn descending
    mapped.sort((a, b) => (b._startMs || 0) - (a._startMs || 0));
    recentEntries.value = mapped.slice(0, 10).map(({ _startMs, _endMs, ...rest }) => rest);

  // Compute weekly and today's totals from entries (Europe/Paris, Mon-Sun)
  const agg = computeAggregatesFromEntries(entries);
  totalHours.value = agg.weekHours.toFixed(1);
  todayHours.value = (Number(agg.todayHours || 0)).toFixed(1);

    // Overtime: try analytics endpoint, fallback to totalHours - 40
    try {
      const ot = await apiService.getOvertimeAnalytics({ period: 'week' });
      const val = Number(
        ot?.overtime_hours ||
        ot?.data?.overtime_hours ||
        ot?.weekly?.overtime ||
        0
      );
      overtimeHours.value = val.toFixed(1);
    } catch (e) {
      // Fallback: overtime as weekly hours beyond 40
      overtimeHours.value = Math.max(0, (Number(agg?.weekHours || 0)) - 40).toFixed(1);
    }
  } catch (e) {
    console.error('Failed to load time data:', e);
    error.value = e?.message || 'Failed to load time data';
  } finally {
    loading.value = false;
  }
}

function mapEntry(entry) {
  const inTs = entry.clock_in || entry.clock_in_time || entry.start_time || entry.started_at || entry.start_date;
  const outTs = entry.clock_out || entry.clock_out_time || entry.end_time || entry.ended_at;
  let hours = Number(entry.duration_hours || entry.hours || 0);
  let startMs = inTs ? new Date(inTs).getTime() : undefined;
  let endMs = outTs ? new Date(outTs).getTime() : undefined;
  if (!hours && startMs && endMs && endMs >= startMs) {
    hours = (endMs - startMs) / 3_600_000;
  }
  const startDate = startMs ? new Date(startMs) : null;
  const endDate = endMs ? new Date(endMs) : null;
  const dateLabel = startDate
    ? startDate.toLocaleDateString('en-CA') // YYYY-MM-DD
    : (endDate ? endDate.toLocaleDateString('en-CA') : '');
  const time = (d) => d ? d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '';
  return {
    id: entry.id || `${inTs || ''}-${outTs || ''}`,
    date: dateLabel,
    clockIn: time(startDate),
    clockOut: time(endDate),
    hours: Number(hours.toFixed ? hours.toFixed(2) : hours).toString(),
    _startMs: startMs,
    _endMs: endMs
  };
}
</script>

<style scoped>
.text-muted-foreground { color: rgba(107,114,128,1); }
.width_topbox { width: 100%; }
.height_topbox { height: 70px; padding-top: 15px;}
.height_topbox2 {padding-top: 15px;}
</style>
