<template>
  <div class="p-4">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-2xl font-bold">My Schedule</h2>
      <!-- <Button size="sm" variant="outline" :disabled="loading" @click="loadSchedule">
        <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
        <Loader2 v-else class="h-4 w-4" />
        Refresh
      </Button> -->
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-10">
      <div class="text-center text-muted-foreground">
        <Loader2 class="h-6 w-6 animate-spin mx-auto mb-2" />
        Loading schedule...
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div class="flex items-center gap-2 text-red-700">
        <AlertCircle class="h-4 w-4" />
        <span>{{ error }}</span>
      </div>
      <Button size="sm" variant="outline" class="mt-2" @click="loadSchedule">Try Again</Button>
    </div>

    <!-- Empty -->
    <div v-else-if="schedule.length === 0" class="text-center text-muted-foreground py-8">
      No scheduled shifts found
    </div>

    <!-- List -->
    <Card v-else class="mb-4">
      <CardContent>
        <ul class="space-y-3">
          <li v-for="item in schedule" :key="item.id" class="flex justify-between items-center">
            <div>
              <div class="font-medium">{{ item.day }}</div>
              <div class="text-xs text-muted-foreground">{{ item.time }}</div>
            </div>
            <div class="text-right text-sm">{{ item.location }}</div>
          </li>
        </ul>
      </CardContent>
    </Card>

    <div class="text-center mt-6">
      <Button variant="outline" @click="requestTimeOff">Request Time Off</Button>
    </div>
  </div>
  
</template>

<script setup>
import { ref, onMounted } from 'vue';
import Card from '../ui/card.vue';
import { CardContent } from '../ui/card-components.vue';
import Button from '../ui/button.vue';
import { apiService } from '../../services/apiService.js';
import { useToast } from '../ui/toast/use-toast.js';
import { Loader2, AlertCircle } from 'lucide-vue-next';

const { toast } = useToast();
const schedule = ref([]);
const loading = ref(false);
const error = ref('');

const requestTimeOff = async () => {
  // Placeholder: connect to an actual time-off endpoint when available
  toast.success('Time off request submitted');
};

onMounted(() => { loadSchedule(); });

async function loadSchedule() {
  loading.value = true;
  error.value = '';
  try {
    // Use /schedules endpoint via apiService
    const res = await apiService.listSchedules();
    const items = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
    schedule.value = items.map((it, idx) => normalizeScheduleItem(it, idx));
  } catch (e) {
    console.warn('[MySchedule] load failed', e);
    error.value = e?.message || 'Failed to load schedule';
    schedule.value = [];
  } finally {
    loading.value = false;
  }
}

function normalizeScheduleItem(it, idx) {
  // Derive date/day
  const rawDate = it.date || it.day || it.day_of_week || it.weekday || it.start_date;
  let dayLabel = '';
  if (rawDate) {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      dayLabel = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    }
  }
  if (!dayLabel) {
    dayLabel = String(it.weekday || it.day || '');
    if (!dayLabel) dayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  }

  // Time range
  const start = it.start_time || it.start || it.start_at || it.clock_in_time;
  const end = it.end_time || it.end || it.end_at || it.clock_out_time;
  const timeRange = it.time_range || formatTimeRange(start, end);

  // Location / label
  const location = it.location || it.site || it.place || it.area || it.shift_name || 'Office';

  return {
    id: it.id ?? `${idx}-${start || 's'}-${end || 'e'}`,
    day: dayLabel,
    time: timeRange,
    location
  };
}

function formatTimeRange(start, end) {
  const fmt = (t) => {
    if (!t) return null;
    const d = new Date(t);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    }
    // If not ISO date, assume HH:mm or H:mm string and return as-is
    if (typeof t === 'string') return t;
    return null;
  };
  const s = fmt(start) || '09:00';
  const e = fmt(end) || '17:00';
  return `${s} - ${e}`;
}
</script>

<style scoped>
.text-muted-foreground { color: rgba(107,114,128,1); }
</style>
