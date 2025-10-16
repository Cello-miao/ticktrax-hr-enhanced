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
        <Card class="p-4">
          <div class="flex items-center gap-2">
            <Users class="h-5 w-5 text-blue-500" />
            <h3 class="font-medium">Total Employees</h3>
          </div>
          <div class="mt-2 text-2xl font-bold text-blue-600">
            {{ overview?.total_employees || 0 }}
          </div>
          <div class="text-xs text-muted-foreground">All employees</div>
        </Card>

        <Card class="p-4">
          <div class="flex items-center gap-2">
            <Clock class="h-5 w-5 text-green-500" />
            <h3 class="font-medium">Clocked In Today</h3>
          </div>
          <div class="mt-2 text-2xl font-bold text-green-600">
            {{ overview?.clocked_in_today || 0 }}
          </div>
          <div class="text-xs text-muted-foreground">clock-in today</div>
        </Card>
      </div>

      <!-- Productivity Metrics -->
      <!-- <Card class="p-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-medium flex items-center gap-2">
            <TrendingUp class="h-4 w-4" />
            Productivity Metrics
          </h3>
          <Select v-model="productivityPeriod" @update:model-value="loadProductivityMetrics">
            <SelectTrigger class="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div v-if="productivityLoading" class="flex items-center justify-center py-4">
          <Loader2 class="h-6 w-6 animate-spin" />
        </div>
        
        <div v-else-if="productivity" class="grid grid-cols-2 gap-4">
          <div>
            <div class="text-sm text-muted-foreground">Average Hours</div>
            <div class="text-lg font-semibold">{{ formatHours(productivity.average_hours || 0) }}</div>
          </div>
          
        </div>
      </Card> -->

      <!-- Team Performance -->
      <!-- <Card class="p-4">
        <h3 class="font-medium flex items-center gap-2 mb-4">
          <Users class="h-4 w-4" />
          Team Performance
        </h3>
        
        <div v-if="teamPerformanceLoading" class="flex items-center justify-center py-4">
          <Loader2 class="h-6 w-6 animate-spin" />
        </div>
        
        <div v-else-if="teamPerformance?.length" class="space-y-3">
          <div 
            v-for="team in teamPerformance.slice(0, 5)" 
            :key="team.team_id || team.name"
            class="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
          >
            <div>
              <div class="font-medium">{{ team.team_name || team.name || 'Unknown Team' }}</div>
              <div class="text-sm text-muted-foreground">{{ team.member_count || 0 }} members</div>
            </div>
            <div class="text-right">
              <div class="font-semibold">{{ formatHours(team.total_hours || 0) }}</div>
              <div class="text-xs text-muted-foreground">total hours</div>
            </div>
          </div>
        </div>
        
        <div v-else class="text-center py-4 text-muted-foreground">
          No team performance data available
        </div>
      </Card> -->

      <!-- Attendance Analytics -->
      <!-- <Card class="p-4">
        <h3 class="font-medium flex items-center gap-2 mb-4">
          <Calendar class="h-4 w-4" />
          Attendance Analytics
        </h3>
        
        <div v-if="attendanceLoading" class="flex items-center justify-center py-4">
          <Loader2 class="h-6 w-6 animate-spin" />
        </div>
        
        <div v-else-if="attendance" class="grid grid-cols-2 gap-4">
          <div>
            <div class="text-sm text-muted-foreground">Attendance Rate</div>
            <div class="text-lg font-semibold">{{ Math.round(attendance.attendance_rate || 0) }}%</div>
          </div>
          <div>
            <div class="text-sm text-muted-foreground">Punctuality</div>
            <div class="text-lg font-semibold">{{ Math.round(attendance.punctuality_rate || 0) }}%</div>
          </div>
        </div>
      </Card> -->

      <!-- Overtime Analytics -->
      <!-- <Card class="p-4">
        <h3 class="font-medium flex items-center gap-2 mb-4">
          <Clock class="h-4 w-4" />
          Overtime Analytics
        </h3>
        
        <div v-if="overtimeLoading" class="flex items-center justify-center py-4">
          <Loader2 class="h-6 w-6 animate-spin" />
        </div>
        
        <div v-else-if="overtime" class="grid grid-cols-2 gap-4">
          <div>
            <div class="text-sm text-muted-foreground">Overtime Hours</div>
            <div class="text-lg font-semibold text-orange-600">{{ formatHours(overtime.total_overtime || 0) }}</div>
          </div>
          <div>
            <div class="text-sm text-muted-foreground">Overtime Rate</div>
            <div class="text-lg font-semibold">{{ Math.round(overtime.overtime_rate || 0) }}%</div>
          </div>
        </div>
      </Card> -->
    </div>
  </div>
</template>

<script setup>
console.debug('[Analytics] module loaded');
import { ref, onMounted, computed } from 'vue';
import Card from '../ui/card.vue';
import Button from '../ui/button.vue';
import Select, { SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select.vue';
import { 
  RefreshCw, Loader2, AlertCircle, Users, Clock, TrendingUp, Calendar 
} from 'lucide-vue-next';
import { apiService } from '../../services/apiService.js';
import { toast } from '../../utils/toast.js';

// Reactive state
const overview = ref(null);
const productivity = ref(null);
const teamPerformance = ref([]);
const attendance = ref(null);
const overtime = ref(null);

const loading = ref(false);
const productivityLoading = ref(false);
const teamPerformanceLoading = ref(false);
const attendanceLoading = ref(false);
const overtimeLoading = ref(false);
const error = ref('');

// Period selection
const productivityPeriod = ref('weekly');

// Computed properties
const hasData = computed(() => {
  return overview.value || productivity.value || teamPerformance.value.length > 0 || attendance.value || overtime.value;
});

// Utility functions
const formatHours = (hours) => {
  if (typeof hours !== 'number') return '0h';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return `${Math.round(hours * 10) / 10}h`;
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

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
const calculateTodayStats = async () => {
  try {
    console.debug('[Analytics] Calculating today\'s stats (active users + avg hours)...');

    // Compute local-day range [startOfDay, startOfNextDay)
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    // Format YYYY-MM-DD for API
    const startDate = startOfDay.toISOString().split('T')[0];
    const endDate = endOfDay.toISOString().split('T')[0];

    console.debug('[Analytics] Fetching /time-tracking/entries with params:', { start_date: startDate, end_date: endDate });

    // Fetch entries strictly within today (backend interprets [start_date, end_date))
    const response = await apiService.getTimeEntries({
      start_date: startDate,
      end_date: endDate,
      limit: 2000
    });

    const entriesRaw = response?.data || response || [];
    const entries = Array.isArray(entriesRaw) ? entriesRaw : (Array.isArray(entriesRaw?.entries) ? entriesRaw.entries : []);

    console.debug('[Analytics] Entries fetched for today:', entries.length);

    // Helper to extract a consistent user id
    const getUserId = (e) => e.user_id || e.userId || e.userID || e.user?.id || e.uid || null;
    const getClockInTs = (e) => e.clock_in || e.clock_in_time || e.clockIn || e.start_time || e.started_at || e.startedAt || null;
    const getClockOutTs = (e) => e.clock_out || e.clock_out_time || e.clockOut || e.end_time || e.ended_at || e.endedAt || null;

    const uniqueUsers = new Set(); // users with any overlap today
    const minutesByUser = new Map(); // total overlapped minutes per user
    const hasClockInToday = new Map(); // uid -> boolean
    const windowStart = startOfDay.getTime();
    const windowEnd = Math.min(endOfDay.getTime(), now.getTime());

    for (const entry of entries) {
      const cin = getClockInTs(entry);
      if (!cin) continue; // skip malformed entries with no start
      const cinMs = new Date(cin).getTime();
      const uid = getUserId(entry);
      if (uid == null) continue;

      const cout = getClockOutTs(entry);
      const coutMs = cout ? new Date(cout).getTime() : windowEnd; // ongoing entries end at now (capped by day end)

      // compute overlap within today's window; count as active if any overlap
      const startMs = Math.max(cinMs, windowStart);
      const endMs = Math.min(coutMs, windowEnd);
      const overlapMin = Math.max(0, Math.floor((endMs - startMs) / 60000));

      // mark users who have an actual clock-in timestamp today
      if (cinMs >= windowStart && cinMs < endOfDay.getTime()) {
        hasClockInToday.set(uid, true);
      }

      if (overlapMin > 0) {
        uniqueUsers.add(uid);
        minutesByUser.set(uid, (minutesByUser.get(uid) || 0) + overlapMin);
      }
    }

    const activeUsersCount = uniqueUsers.size;
    const clockedInTodayCount = Array.from(hasClockInToday.keys()).length;

    console.debug('[Analytics] Active users today:', activeUsersCount, 'Clocked-in today:', clockedInTodayCount);
    return { activeUsersCount, clockedInTodayCount };
  } catch (err) {
    console.error('[Analytics] Error calculating today\'s stats:', err);
    return { activeUsersCount: 0, clockedInTodayCount: 0 };
  }
};

// Load productivity metrics
const loadProductivityMetrics = async () => {
  productivityLoading.value = true;
  try {
    console.debug('[Analytics] Loading productivity metrics...', productivityPeriod.value);
    const response = await apiService.getProductivityMetrics({ 
      period: productivityPeriod.value 
    });
    productivity.value = response?.data || response;
    console.debug('[Analytics] Productivity loaded:', productivity.value);
  } catch (err) {
    console.error('[Analytics] Error loading productivity:', err);
    // Don't show error for productivity as it's not critical
  } finally {
    productivityLoading.value = false;
  }
};

// Load team performance
const loadTeamPerformance = async () => {
  teamPerformanceLoading.value = true;
  try {
    console.debug('[Analytics] Loading team performance...');
    const response = await apiService.getTeamPerformance();
    const data = response?.data || response;
    teamPerformance.value = Array.isArray(data) ? data : [];
    console.debug('[Analytics] Team performance loaded:', teamPerformance.value.length, 'teams');
  } catch (err) {
    console.error('[Analytics] Error loading team performance:', err);
    teamPerformance.value = [];
  } finally {
    teamPerformanceLoading.value = false;
  }
};

// Load attendance analytics
const loadAttendanceAnalytics = async () => {
  attendanceLoading.value = true;
  try {
    console.debug('[Analytics] Loading attendance analytics...');
    
    // Get date range for current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const response = await apiService.getAttendanceAnalytics({
      start_date: startOfMonth.toISOString().split('T')[0],
      end_date: endOfMonth.toISOString().split('T')[0]
    });
    attendance.value = response?.data || response;
    console.debug('[Analytics] Attendance loaded:', attendance.value);
  } catch (err) {
    console.error('[Analytics] Error loading attendance:', err);
    // Don't show error for attendance as it's not critical
  } finally {
    attendanceLoading.value = false;
  }
};

// Load overtime analytics
const loadOvertimeAnalytics = async () => {
  overtimeLoading.value = true;
  try {
    console.debug('[Analytics] Loading overtime analytics...');
    const response = await apiService.getOvertimeAnalytics({ 
      period: 'monthly' 
    });
    overtime.value = response?.data || response;
    console.debug('[Analytics] Overtime loaded:', overtime.value);
  } catch (err) {
    console.error('[Analytics] Error loading overtime:', err);
    // Don't show error for overtime as it's not critical
  } finally {
    overtimeLoading.value = false;
  }
};

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

// Refresh analytics
const refreshAnalytics = () => {
  loadAnalytics();
};

// Initialize component
onMounted(async () => {
  console.debug('[Analytics] mounted');
  await loadAnalytics();
});
</script>

<style scoped>
</style>
