<template>
  <div class="p-4">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-semibold">Analytics</h2>
      <!-- <Button @click="refreshAnalytics" :disabled="loading" size="sm" variant="outline">
        <RefreshCw v-if="loading" class="h-4 w-4 animate-spin" />
        <RefreshCw v-else class="h-4 w-4" />
        Refresh
      </Button> -->
    </div>

    <!-- Loading State -->
    <div v-if="loading && !overview" class="flex items-center justify-center py-8">
      <div class="text-center">
        <Loader2 class="h-8 w-8 animate-spin mx-auto mb-2" />
        <p class="text-muted-foreground">Loading analytics...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div class="flex items-center gap-2">
        <AlertCircle class="h-4 w-4 text-red-500" />
        <p class="text-red-700">{{ error }}</p>
      </div>
      <Button @click="loadAnalytics" size="sm" variant="outline" class="mt-2">
        Try Again
      </Button>
    </div>

    <!-- Analytics Content -->
    <div v-else class="space-y-4">
      <!-- Overview Stats: only two numbers required -->
      <div class="grid grid-cols-2 gap-4">
        <Card class="p-4 width_class">
          <div class="flex items-center gap-2">
            <Users class="h-5 w-5 text-blue-500" />
            <h3 class="font-medium">Total Employees</h3>
          </div>
          <div class="mt-2 text-2xl font-bold text-blue-600">
            {{ overview?.total_employees || 0 }}
          </div>
          <div class="text-xs text-muted-foreground">All employees</div>
        </Card>

        <!-- <Card class="p-4 width_class">
          <div class="flex items-center gap-2">
            <Clock class="h-5 w-5 text-green-500" />
            <h3 class="font-medium">Clocked In Today</h3>
          </div>
          <div class="mt-2 text-2xl font-bold text-green-600">
            {{ overview?.clocked_in_today || 0 }}
          </div>
          <div class="text-xs text-muted-foreground">clock-in today</div>
        </Card> -->
      </div>
    </div>
  </div>
</template>

<script setup>
console.debug('[Analytics] module loaded');
import { ref, onMounted, computed } from 'vue';
import Card from '../ui/card.vue';
import Button from '../ui/button.vue';
import { 
  RefreshCw, Loader2, AlertCircle, Users, Clock, TrendingUp, Calendar 
} from 'lucide-vue-next';
import { apiService } from '../../services/apiService.js';

// Reactive state
const overview = ref(null);
const loading = ref(false);
const error = ref('');

// Load analytics overview
const loadOverview = async () => {
  try {
    console.debug('[Analytics] Loading overview...');
    // Total employees
    const usersRes = await apiService.listUsers();
    const usersArr = Array.isArray(usersRes?.data) ? usersRes.data : (Array.isArray(usersRes) ? usersRes : []);
    const totalEmployees = usersArr.length;

    // Today stats (we only need how many clocked in today)
    const { clockedInTodayCount } = await calculateTodayStats();

    overview.value = {
      total_employees: totalEmployees,
      clocked_in_today: clockedInTodayCount
    };
    
    console.debug('[Analytics] Overview loaded:', overview.value);
  } catch (err) {
    console.error('[Analytics] Error loading overview:', err);
    // Don't set error for overview as it's not critical
  }
};

// Calculate today's stats; we derive clocked-in-today count here
// const calculateTodayStats = async () => {
//   try {
//   console.debug('[Analytics] Calculating today\'s stats from /working_times ...');

//     // Compute local-day range [startOfDay, startOfNextDay)
//     const now = new Date();
//     const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
//     const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

//     // Format YYYY-MM-DD for API
//     const startDate = startOfDay.toISOString().split('T')[0];
//     const endDate = endOfDay.toISOString().split('T')[0];

//     // Fetch working times (no guaranteed server-side filtering; filter client-side for today)
//     const response = await apiService.listWorkingTimes();

//     const wtRaw = response?.data || response || [];
//     const workingTimes = Array.isArray(wtRaw) ? wtRaw : (Array.isArray(wtRaw?.items) ? wtRaw.items : []);

//     console.debug('[Analytics] Working times fetched:', workingTimes.length);

//     // Helper to extract fields in a tolerant way
//     const getUserId = (e) => e.user_id || e.userId || e.userID || e.user?.id || e.uid || e.employee_id || null;
//     const getStartTs = (e) => e.start_time || e.start || e.clock_in || e.clock_in_time || e.started_at || e.startedAt || null;
//     const getEndTs = (e) => e.end_time || e.end || e.clock_out || e.clock_out_time || e.ended_at || e.endedAt || null;

//     const uniqueUsers = new Set(); // users with any overlap today
//     const minutesByUser = new Map(); // total overlapped minutes per user
//     const hasClockInToday = new Map(); // uid -> boolean (start within today)
//     const windowStart = startOfDay.getTime();
//     const windowEnd = Math.min(endOfDay.getTime(), now.getTime());

//     for (const wt of workingTimes) {
//       const cin = getStartTs(wt);
//       if (!cin) continue; // skip malformed entries with no start
//       const cinMs = new Date(cin).getTime();
//       const uid = getUserId(wt);
//       if (uid == null) continue;

//       const cout = getEndTs(wt);
//       const coutMs = cout ? new Date(cout).getTime() : windowEnd; // ongoing entries end at now (capped by day end)

//       // compute overlap within today's window; count as active if any overlap
//       const startMs = Math.max(cinMs, windowStart);
//       const endMs = Math.min(coutMs, windowEnd);
//       const overlapMin = Math.max(0, Math.floor((endMs - startMs) / 60000));

//       // mark users who have an actual clock-in timestamp today
//       if (cinMs >= windowStart && cinMs < endOfDay.getTime()) {
//         hasClockInToday.set(uid, true);
//       }

//       if (overlapMin > 0) {
//         uniqueUsers.add(uid);
//         minutesByUser.set(uid, (minutesByUser.get(uid) || 0) + overlapMin);
//       }
//     }

//     const activeUsersCount = uniqueUsers.size;
//     const clockedInTodayCount = Array.from(hasClockInToday.keys()).length;

//     console.debug('[Analytics] Active users today:', activeUsersCount, 'Clocked-in today:', clockedInTodayCount);
//     return { activeUsersCount, clockedInTodayCount };
//   } catch (err) {
//     console.error('[Analytics] Error calculating today\'s stats:', err);
//     return { activeUsersCount: 0, clockedInTodayCount: 0 };
//   }
// };

// Load all analytics data
const loadAnalytics = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    console.debug('[Analytics] Loading all analytics data...');
    // Only load the two required numbers
    await loadOverview();
    
    console.debug('[Analytics] All analytics loaded successfully');
  } catch (err) {
    console.error('[Analytics] Error loading analytics:', err);
    error.value = err?.message || 'Failed to load analytics data';
  } finally {
    loading.value = false;
  }
};

// Initialize component
onMounted(async () => {
  console.debug('[Analytics] mounted');
  await loadAnalytics();
});
</script>

<style scoped>
.width_class {
  width: 100%;
}
</style>
