<template>
  <div class="p-4">
    <h2 class="text-2xl font-bold mb-4">My Report</h2>

    <Card class="mb-4">
      <CardContent>
        <h3 class="font-semibold mb-2">This Month</h3>
        <div class="grid grid-cols-2 gap-4 text-center mb-4">
          <div>
            <div class="text-3xl font-bold">{{ hoursThisMonth }}</div>
            <div class="text-sm text-muted-foreground">Hours</div>
          </div>
          <div>
            <div class="text-3xl font-bold">{{ daysWorked }}</div>
            <div class="text-sm text-muted-foreground">Days Worked</div>
          </div>
        </div>

        <!-- <h4 class="font-medium mb-2">Recent Notes</h4>
        <ul class="space-y-2 text-sm text-muted-foreground">
          <li v-for="note in notes" :key="note.id">{{ note.text }}</li>
        </ul> -->
      </CardContent>
    </Card>

    <Card class="mb-4">
      <CardContent>
        <h3 class="font-semibold mb-2">Hours This Week (Mon–Sun)</h3>
        <div class="w-full overflow-x-auto">
          <div class="min-w-[280px]">
            <div class="relative h-56">
              <Bar :data="chartData" :options="chartOptions" :key="chartDataKey" />
            </div>
            <div class="mt-3 text-xs text-muted-foreground">
              <div v-if="weeklyHoursList.reduce((a,b)=>a+b,0) === 0">No data this week.</div>
              <div v-else class="grid grid-cols-7 gap-2 text-center">
                <div v-for="(h, i) in weeklyHoursList" :key="i">{{ h.toFixed(1) }}h</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- <div class="text-center mt-6">
      <Button @click="exportReport">Export PDF</Button>
    </div> -->
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { Bar } from 'vue-chartjs';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from 'chart.js';
import Card from '../ui/card.vue';
import { CardContent } from '../ui/card-components.vue';
import Button from '../ui/button.vue';
import { apiService } from '../../services/apiService.js';
import { computeAggregatesFromEntries, countDaysWorkedInMonthParis, computeWeekHistogramParis } from '../../utils/timeUtils.js';
import { useToast } from '../ui/toast/use-toast.js';

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const { toast } = useToast();
const hoursThisMonth = ref('0h');
const daysWorked = ref(0);
const notes = ref([]);
const weeklyHoursList = ref([0,0,0,0,0,0,0]);

const chartData = ref({
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  datasets: [
    {
      label: 'Hours',
      data: [0, 0, 0, 0, 0, 0, 0],
      backgroundColor: '#4f46e5',
      borderRadius: 6,
      barThickness: 20,
    },
  ],
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    title: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => `${Number(ctx.parsed.y).toFixed(2)}h`,
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
    },
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(0,0,0,0.06)' },
      ticks: {
        callback: (val) => `${val}h`,
        stepSize: 2,
      },
    },
  },
};
const chartDataKey = computed(() => (chartData.value?.datasets?.[0]?.data || []).join(','));

const exportReport = () => {
  // Hook up to reports export endpoint when ready
  toast.success('Export requested');
};

onMounted(async () => {
  try {
    const res = await apiService.getTimeEntries({ page: 1, limit: 500 });
    const entries = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
    const agg = computeAggregatesFromEntries(entries);
    hoursThisMonth.value = `${agg.monthHours.toFixed(1)}h`;
    daysWorked.value = countDaysWorkedInMonthParis(entries);
    // Build recent notes from the latest entries (most recent first)
    const withTs = entries.map((e) => ({ e, ts: mostRecentTs(e) }))
      .filter(({ ts }) => Number.isFinite(ts));
    withTs.sort((a, b) => b.ts - a.ts);
    notes.value = withTs.slice(0, 3).map(({ e }, i) => ({
      id: e.id || i + 1,
      text: formatRecentEntry(e)
    }));

    // Compute hours per day for the current week (Mon–Sun)
    const hist = computeWeekHistogramParis(entries);
    // Debug visibility on device
    try { console.log('[MyReport] entries:', (entries || []).length, 'hist:', hist); } catch(_) {}
    chartData.value = {
      labels: hist.labels,
      datasets: [
        {
          ...chartData.value.datasets[0],
          data: hist.hours.map((h) => Number((h || 0).toFixed(2))),
        },
      ],
    };
    weeklyHoursList.value = hist.hours.map(h => Number(h || 0));
  } catch (e) {
    console.warn('[MyReport] load failed', e);
  }
});

function mostRecentTs(e) {
  const fields = [
    e.clock_out, e.clock_out_time, e.end_time, e.ended_at,
    e.clock_in, e.clock_in_time, e.start_time, e.started_at,
    e.updated_at, e.created_at
  ];
  let max = NaN;
  for (const f of fields) {
    if (!f) continue;
    const d = new Date(f);
    const t = d.getTime();
    if (Number.isFinite(t)) max = Math.max(Number.isFinite(max) ? max : t, t);
  }
  return max;
}

function formatRecentEntry(e) {
  // If server provided notes text, use it directly
  if (e.notes && typeof e.notes === 'string') return e.notes;
  const start = e.clock_in || e.clock_in_time || e.start_time || e.started_at;
  const end = e.clock_out || e.clock_out_time || e.end_time || e.ended_at;
  const datePart = formatDateLabel(new Date(end || start || Date.now()));
  const range = formatTimeRangeText(start, end);
  return `${datePart} • ${range}`;
}

function formatDateLabel(d) {
  try {
    if (!(d instanceof Date)) d = new Date(d);
    if (!Number.isFinite(d.getTime())) d = new Date();
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch (_) {
    return '';
  }
}

function formatTimeRangeText(start, end) {
  const tfmt = (val) => {
    if (!val) return null;
    const d = new Date(val);
    if (Number.isFinite(d.getTime())) {
      return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    }
    if (typeof val === 'string') return val; // already looks like HH:mm
    return null;
  };
  const s = tfmt(start);
  const e = tfmt(end);
  if (s && e) return `${s} — ${e}`;
  if (s) return `In ${s}`;
  if (e) return `Out ${e}`;
  return 'No time recorded';
}

// Removed local helpers in favor of centralized utils
</script>

<style scoped>
.text-muted-foreground { color: rgba(107,114,128,1); }
</style>
