<template>
  <div class="p-4">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-semibold">Analytics</h2>
      <Button @click="refreshAnalytics" :disabled="loading" size="sm" variant="outline">
        <RefreshCw v-if="loading" class="h-4 w-4 animate-spin" />
        <RefreshCw v-else class="h-4 w-4" />
        Refresh
      </Button>
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
      <!-- Overview Stats -->
      <div class="grid grid-cols-2 gap-4">
        <Card class="p-4">
          <div class="flex items-center gap-2">
            <Users class="h-5 w-5 text-blue-500" />
            <h3 class="font-medium">Active Users Today</h3>
          </div>
          <div class="mt-2 text-2xl font-bold text-blue-600">
            {{ overview?.active_users || 0 }}
          </div>
          <div class="text-xs text-muted-foreground">Users who clocked in today</div>
        </Card>

        <Card class="p-4">
          <div class="flex items-center gap-2">
            <Clock class="h-5 w-5 text-green-500" />
            <h3 class="font-medium">Hours Today</h3>
          </div>
          <div class="mt-2 text-2xl font-bold text-green-600">
            {{ formatHours(overview?.hours_today || 0) }}
          </div>
          <div class="text-xs text-muted-foreground">Total logged</div>
        </Card>
      </div>

      <!-- Productivity Metrics -->
      <Card class="p-4">
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
          <!-- <div>
            <div class="text-sm text-muted-foreground">Efficiency</div>
            <div class="text-lg font-semibold">{{ Math.round(productivity.efficiency || 0) }}%</div>
          </div> -->
        </div>
      </Card>

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
      <Card class="p-4">
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
      </Card>
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
    const response = await apiService.getAnalyticsOverview();
    const analyticsData = response?.data || response || {};
    
    // Calculate today's active users from time tracking entries
    const todayActiveUsers = await calculateTodayActiveUsers();
    
    overview.value = {
      ...analyticsData,
      active_users: todayActiveUsers,
      hours_today: analyticsData.hours_today || 0
    };
    
    console.debug('[Analytics] Overview loaded:', overview.value);
  } catch (err) {
    console.error('[Analytics] Error loading overview:', err);
    // Don't set error for overview as it's not critical
  }
};

// Calculate today's active users from time tracking entries
const calculateTodayActiveUsers = async () => {
  try {
    console.debug('[Analytics] Calculating today\'s active users...');
    
    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    // Format dates for API
    const startDate = startOfDay.toISOString().split('T')[0];
    const endDate = endOfDay.toISOString().split('T')[0];
    
    console.debug('[Analytics] Fetching time entries for:', startDate, 'to', endDate);
    
    // Fetch time tracking entries for today
    const response = await apiService.getTimeEntries({
      start_date: startDate,
      end_date: endDate
    });
    
    const entries = response?.data || response || [];
    const entriesArray = Array.isArray(entries) ? entries : [];
    
    console.debug('[Analytics] Found', entriesArray.length, 'time entries for today');
    
    // Count unique users who have clocked in today
    const uniqueUsers = new Set();
    
    entriesArray.forEach(entry => {
      // Check if entry has clock_in data and is from today
      const clockInTime = entry.clock_in || entry.clock_in_time || entry.start_time || entry.started_at;
      if (clockInTime) {
        const clockInDate = new Date(clockInTime);
        const isToday = clockInDate >= startOfDay && clockInDate < endOfDay;
        
        if (isToday && entry.user_id) {
          uniqueUsers.add(entry.user_id);
        }
      }
    });
    
    const activeUsersCount = uniqueUsers.size;
    console.debug('[Analytics] Today\'s active users:', activeUsersCount, 'unique users');
    
    return activeUsersCount;
  } catch (err) {
    console.error('[Analytics] Error calculating today\'s active users:', err);
    return 0;
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
    
    // Load all analytics in parallel
    await Promise.all([
      loadOverview(),
      loadProductivityMetrics(),
      loadTeamPerformance(),
      loadAttendanceAnalytics(),
      loadOvertimeAnalytics()
    ]);
    
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
