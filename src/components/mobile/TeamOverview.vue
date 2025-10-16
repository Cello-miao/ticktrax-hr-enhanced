<template>
  <div class="p-4">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-2xl font-bold">Team Overview</h2>
      <Button @click="refreshTeam" :disabled="loading" size="sm" variant="outline">
        <RefreshCw v-if="loading" class="h-4 w-4 animate-spin" />
        <RefreshCw v-else class="h-4 w-4" />
        Refresh
      </Button>
    </div>

    <!-- Loading State -->
    <div v-if="loading && !teamData" class="flex items-center justify-center py-8">
      <div class="text-center">
        <Loader2 class="h-8 w-8 animate-spin mx-auto mb-2" />
        <p class="text-muted-foreground">Loading team data...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div class="flex items-center gap-2">
        <AlertCircle class="h-4 w-4 text-red-500" />
        <p class="text-red-700">{{ error }}</p>
      </div>
      <Button @click="loadTeamData" size="sm" variant="outline" class="mt-2">
        Try Again
      </Button>
    </div>

    <!-- Team Content -->
    <div v-else class="space-y-4">
      <!-- Team Stats -->
      <div class="grid grid-cols-2 gap-4">
        <Card class="p-4">
          <div class="flex items-center gap-2">
            <Clock class="h-5 w-5 text-blue-500" />
            <div>
              <div class="text-sm text-muted-foreground">Team Hours</div>
              <div class="text-2xl font-bold text-blue-600">{{ formatHours(teamData?.total_hours || 0) }}</div>
            </div>
          </div>
        </Card>

        <Card class="p-4">
          <div class="flex items-center gap-2">
            <Users class="h-5 w-5 text-green-500" />
            <div>
              <div class="text-sm text-muted-foreground">On Duty</div>
              <div class="text-2xl font-bold text-green-600">{{ teamData?.on_duty || 0 }}</div>
            </div>
          </div>
        </Card>
      </div>

      <!-- Team Performance -->
      <Card v-if="teamPerformance" class="p-4">
        <h3 class="font-medium flex items-center gap-2 mb-3">
          <TrendingUp class="h-4 w-4" />
          Team Performance
        </h3>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <div class="text-sm text-muted-foreground">Efficiency</div>
            <div class="text-lg font-semibold">{{ Math.round(teamPerformance.efficiency || 0) }}%</div>
          </div>
          <div>
            <div class="text-sm text-muted-foreground">Productivity</div>
            <div class="text-lg font-semibold">{{ Math.round(teamPerformance.productivity || 0) }}%</div>
          </div>
        </div>
      </Card>

      <!-- Team Members -->
      <Card class="p-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-medium flex items-center gap-2">
            <Users class="h-4 w-4" />
            Team Members ({{ members.length }})
          </h3>
          <Select v-model="selectedTeam" @update:model-value="loadTeamMembers">
            <SelectTrigger class="w-40">
              <SelectValue placeholder="Select team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Members</SelectItem>
              <SelectItem v-for="team in teams" :key="team.id" :value="team.id">
                {{ team.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div v-if="membersLoading" class="flex items-center justify-center py-4">
          <Loader2 class="h-6 w-6 animate-spin" />
        </div>

        <div v-else-if="members.length === 0" class="text-center py-4 text-muted-foreground">
          No team members found
        </div>

        <div v-else class="space-y-3">
          <div 
            v-for="member in members" 
            :key="member.id" 
            class="flex items-center justify-between gap-3 p-3 bg-muted/50 rounded-lg"
          >
            <div class="flex items-center gap-3">
              <div class="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white text-sm font-medium">
                {{ member.initials }}
              </div>
              <div>
                <div class="font-medium">{{ member.name }}</div>
                <div class="text-xs text-muted-foreground">{{ member.role }}</div>
                <div v-if="member.status" class="flex items-center gap-1 mt-1">
                  <div :class="[
                    'w-2 h-2 rounded-full',
                    member.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                  ]" />
                  <span class="text-xs text-muted-foreground">{{ member.status }}</span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <Button size="sm" variant="ghost" @click="message(member)" :disabled="loading">
                <MessageCircle class="h-3 w-3 mr-1" />
                Message
              </Button>
              <Button size="sm" @click="viewProfile(member)" :disabled="loading">
                <User class="h-3 w-3 mr-1" />
                View
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <!-- Team Analytics -->
      <Card v-if="teamAnalytics" class="p-4">
        <h3 class="font-medium flex items-center gap-2 mb-3">
          <BarChart3 class="h-4 w-4" />
          Team Analytics
        </h3>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <div class="text-sm text-muted-foreground">Attendance Rate</div>
            <div class="text-lg font-semibold">{{ Math.round(teamAnalytics.attendance_rate || 0) }}%</div>
          </div>
          <div>
            <div class="text-sm text-muted-foreground">Overtime Hours</div>
            <div class="text-lg font-semibold text-orange-600">{{ formatHours(teamAnalytics.overtime_hours || 0) }}</div>
          </div>
        </div>
      </Card>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import Card from '../ui/card.vue';
import Button from '../ui/button.vue';
import Select, { SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select.vue';
import { 
  RefreshCw, Loader2, AlertCircle, Users, Clock, TrendingUp, 
  MessageCircle, User, BarChart3 
} from 'lucide-vue-next';
import { apiService } from '../../services/apiService.js';
import { toast } from '../../utils/toast.js';

// Reactive state
const teamData = ref(null);
const teamPerformance = ref(null);
const teamAnalytics = ref(null);
const members = ref([]);
const teams = ref([]);
const selectedTeam = ref('all');

const loading = ref(false);
const membersLoading = ref(false);
const error = ref('');

// Computed properties
const activeMembers = computed(() => members.value.filter(m => m.status === 'online'));
const totalMembers = computed(() => members.value.length);

// Utility functions
const formatHours = (hours) => {
  if (typeof hours !== 'number') return '0h';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return `${Math.round(hours * 10) / 10}h`;
};

const getInitials = (user) => {
  const first = user.first_name?.[0] || user.name?.[0] || 'U';
  const last = user.last_name?.[0] || '';
  return (first + last).toUpperCase();
};

// Load team data from analytics
const loadTeamData = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    console.debug('[TeamOverview] Loading team data...');
    
    // Load analytics overview for team stats
    const analyticsResponse = await apiService.getAnalyticsOverview();
    const analytics = analyticsResponse?.data || analyticsResponse || {};
    
    teamData.value = {
      total_hours: analytics.team_hours || analytics.total_hours || 0,
      on_duty: analytics.on_duty || analytics.active_users || 0
    };
    
    // Load team performance
    try {
      const performanceResponse = await apiService.getTeamPerformance();
      teamPerformance.value = performanceResponse?.data || performanceResponse;
    } catch (err) {
      console.warn('[TeamOverview] Team performance not available:', err);
    }
    
    // Load team analytics (attendance, overtime)
    try {
      const attendanceResponse = await apiService.getAttendanceAnalytics();
      const overtimeResponse = await apiService.getOvertimeAnalytics({ period: 'monthly' });
      
      teamAnalytics.value = {
        attendance_rate: attendanceResponse?.attendance_rate || 0,
        overtime_hours: overtimeResponse?.total_overtime || 0
      };
    } catch (err) {
      console.warn('[TeamOverview] Team analytics not available:', err);
    }
    
    console.debug('[TeamOverview] Team data loaded:', teamData.value);
  } catch (err) {
    console.error('[TeamOverview] Error loading team data:', err);
    error.value = err?.message || 'Failed to load team data';
  } finally {
    loading.value = false;
  }
};

// Load teams list
const loadTeams = async () => {
  try {
    console.debug('[TeamOverview] Loading teams...');
    const response = await apiService.listTeams();
    const teamsData = response?.data || response || [];
    teams.value = Array.isArray(teamsData) ? teamsData : [];
    console.debug('[TeamOverview] Teams loaded:', teams.value.length);
  } catch (err) {
    console.error('[TeamOverview] Error loading teams:', err);
    teams.value = [];
  }
};

// Load team members
const loadTeamMembers = async () => {
  membersLoading.value = true;
  
  try {
    console.debug('[TeamOverview] Loading team members...', selectedTeam.value);
    
    const response = await apiService.getTeamMembers();
    const usersData = response?.data || response || [];
    let allMembers = Array.isArray(usersData) ? usersData : [];
    
    // Filter by selected team if not "all"
    if (selectedTeam.value !== 'all') {
      allMembers = allMembers.filter(user => user.team_id === selectedTeam.value);
    }
    
    // Map users to member format
    members.value = allMembers.map(user => ({
      id: user.id,
      name: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
      role: user.role?.name || user.role || 'Employee',
      email: user.email,
      status: user.active ? 'online' : 'offline',
      initials: getInitials(user),
      team_id: user.team_id,
      department: user.department
    }));
    
    console.debug('[TeamOverview] Members loaded:', members.value.length);
  } catch (err) {
    console.error('[TeamOverview] Error loading team members:', err);
    members.value = [];
  } finally {
    membersLoading.value = false;
  }
};

// Refresh all team data
const refreshTeam = async () => {
  await Promise.all([
    loadTeamData(),
    loadTeams(),
    loadTeamMembers()
  ]);
};

// View member profile
const viewProfile = (member) => {
  console.debug('[TeamOverview] Viewing profile for:', member.id);
  toast.info(`Viewing profile for ${member.name}`);
  // TODO: Implement profile view modal or navigation
};

// Message member
const message = (member) => {
  console.debug('[TeamOverview] Messaging:', member.id);
  toast.info(`Opening chat with ${member.name}`);
  // TODO: Implement messaging functionality
};

// Initialize component
onMounted(async () => {
  console.debug('[TeamOverview] mounted');
  await refreshTeam();
});
</script>

<style scoped>
.text-muted-foreground { color: rgba(107,114,128,1); }
</style>
