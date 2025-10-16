<template>
  <div class="mobile-clock-widget space-y-6">
    <!-- Status Card -->
    <Card class="shadow-lg border-0">
      <CardContent class="p-6">
        <div class="text-center space-y-4">
          <!-- Current Time Display -->
          <div class="space-y-2">
            <div class="text-4xl font-mono font-bold tracking-wider">
              {{ currentTime }}
            </div>
            <div class="text-sm text-muted-foreground">
              {{ currentDate }}
            </div>
          </div>

          <!-- Status Indicator -->
          <div class="flex items-center justify-center gap-3">
            <div :class="[
              'w-3 h-3 rounded-full',
              isClockedIn ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            ]" />
            <span class="font-medium">
              {{ isClockedIn ? 'Clocked In' : 'Clocked Out' }}
            </span>
          </div>

          <!-- Work Session Info -->
          <!-- <div v-if="isClockedIn" class="bg-muted/50 rounded-lg p-4 space-y-2">
            <div class="text-sm text-muted-foreground">Today's Work Time</div>
            <div class="text-2xl font-mono font-semibold">
              {{ workTimeTodayText }}
            </div>
            <div class="text-xs text-muted-foreground">
              Started at {{ clockInAt }}
            </div>
          </div> -->
        </div>
      </CardContent>
    </Card>

    <!-- Action Buttons -->
    <div class="space-y-3">
      <!-- Primary Clock Action -->
      <Button
        :class="[
          'w-full h-16 text-lg font-semibold rounded-xl shadow-lg',
          isClockedIn 
            ? 'bg-red-500 hover:bg-red-600 text-white' 
            : 'bg-green-500 hover:bg-green-600 text-white'
        ]"
        @click="toggleClock"
        :disabled="isLoading"
      >
        <div class="flex items-center justify-center gap-3">
          <Loader2 v-if="isLoading" class="h-6 w-6 animate-spin" />
          <component v-else :is="isClockedIn ? Square : Play" class="h-6 w-6" />
          <span>{{ isClockedIn ? 'Clock Out' : 'Clock In' }}</span>
        </div>
      </Button>

      <!-- Secondary Actions -->
      <!-- <div class="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          class="h-12 gap-2"
          @click="$emit('show-break-dialog')"
          :disabled="!clockedIn"
        >
          <Coffee class="h-4 w-4" />
          Break
        </Button>
        
        <Button
          variant="outline"
          class="h-12 gap-2"
          @click="$emit('show-timesheet')"
        >
          <FileText class="h-4 w-4" />
          Timesheet
        </Button>
      </div> -->
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-2 gap-4">
      <Card>
        <CardContent class="p-4 text-center">
          <div class="text-2xl font-bold text-primary">{{ weeklyHours }}</div>
          <div class="text-sm text-muted-foreground">This Week</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent class="p-4 text-center">
          <div class="text-2xl font-bold text-primary">{{ monthlyHours }}</div>
          <div class="text-sm text-muted-foreground">This Month</div>
        </CardContent>
      </Card>
    </div>

    <!-- Recent Activity -->
    <Card>
      <CardContent class="p-4">
        <div class="flex items-center gap-2 mb-4">
          <History class="h-4 w-4 text-muted-foreground" />
          <span class="font-medium">Recent Activity</span>
        </div>
        
        <div class="space-y-3">
          <div 
            v-for="activity in recentActivity" 
            :key="activity.id"
            class="flex items-center justify-between py-2 border-b last:border-b-0"
          >
            <div class="flex items-center gap-3">
              <div :class="[
                'w-2 h-2 rounded-full',
                activity.type === 'in' ? 'bg-green-500' : 'bg-red-500'
              ]" />
              <div>
                <div class="text-sm font-medium">
                  {{ activity.type === 'in' ? 'Clocked In' : 'Clocked Out' }}
                </div>
                <div class="text-xs text-muted-foreground">
                  {{ activity.date }}
                </div>
              </div>
            </div>
            <div class="text-sm font-mono">
              {{ activity.time }}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Location Info (if GPS enabled) -->
    <Card v-if="locationEnabled">
      <CardContent class="p-4">
        <div class="flex items-center gap-2 mb-2">
          <MapPin class="h-4 w-4 text-muted-foreground" />
          <span class="font-medium">Location</span>
          <Badge v-if="locationVerified" variant="success" class="text-xs">
            Verified
          </Badge>
          <div class="ml-auto">
            <Button size="sm" variant="outline" @click="getCurrentLocation" :disabled="isLoading">
              Refresh
            </Button>
          </div>
        </div>
        <div class="text-sm text-muted-foreground">
          {{ currentLocation || 'Getting location...' }}
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import Card from '../ui/card.vue';
import { CardContent } from '../ui/card-components.vue';
import Button from '../ui/button.vue';
import Badge from '../ui/badge.vue';
import { 
  Clock, Play, Square, Coffee, FileText, History, 
  MapPin, Loader2 
} from 'lucide-vue-next';
import { apiService } from '../../services/apiService.js';
import cordovaIntegration from '../../services/cordovaIntegration.js';

const props = defineProps({
  // Legacy props kept for backward compatibility; component now fetches status from API
  clockedIn: { type: Boolean, default: false },
  clockInTime: String,
  workTimeToday: { type: String, default: '0:00' },
  weeklyHours: { type: String, default: '0h' },
  monthlyHours: { type: String, default: '0h' },
  locationEnabled: { type: Boolean, default: false }
});

const emit = defineEmits([
  'clock-in', 
  'clock-out', 
  'show-break-dialog', 
  'show-timesheet'
]);

const currentTime = ref('');
const currentDate = ref('');
const isLoading = ref(false);
const currentLocation = ref('');
const locationVerified = ref(false);
// Persist numeric coordinates for API payloads
const latitude = ref(null);
const longitude = ref(null);

// Time status local state (fetched from /time-tracking/status)
const isClockedIn = ref(false);
const clockInAt = ref(props.clockInTime || '');
const workTimeTodayText = ref(props.workTimeToday || '0:00');

const recentActivity = ref([]);
const activityLoading = ref(false);
const activityError = ref('');

let timeInterval;
let activityInterval;
let statusInterval;
let locationWatchId = null;

onMounted(() => {
  updateTime();
  timeInterval = setInterval(updateTime, 1000);
  // Initialize with prop for immediate UI, then refresh from API
  isClockedIn.value = !!props.clockedIn;
  fetchTimeStatus().catch(() => {});
  // Periodically refresh status while on screen
  statusInterval = setInterval(() => fetchTimeStatus().catch(() => {}), 60_000);
  
  if (props.locationEnabled) {
    getCurrentLocation();
    // Start a background watch to keep last-known coordinates fresh
    if (navigator?.geolocation && typeof navigator.geolocation.watchPosition === 'function') {
      locationWatchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords || {};
          if (typeof lat === 'number' && typeof lng === 'number') {
            latitude.value = lat;
            longitude.value = lng;
            currentLocation.value = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
            locationVerified.value = true;
          }
        },
        (err) => {
          console.warn('Location watch error:', err);
        },
        { enableHighAccuracy: true, maximumAge: 5000 }
      );
    }
  }

  // Load real recent activity from API and refresh periodically
  loadRecentActivity();
  activityInterval = setInterval(loadRecentActivity, 60_000); // refresh every minute
});

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval);
  }
  if (activityInterval) {
    clearInterval(activityInterval);
  }
  if (statusInterval) {
    clearInterval(statusInterval);
  }
  if (locationWatchId && navigator?.geolocation?.clearWatch) {
    try { navigator.geolocation.clearWatch(locationWatchId); } catch (_) {}
    locationWatchId = null;
  }
});

const updateTime = () => {
  const now = new Date();
  currentTime.value = now.toLocaleTimeString('en-US', { 
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  currentDate.value = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const getCurrentLocation = async () => {
  try {
    // Ensure Cordova is ready when applicable
    try { await cordovaIntegration.waitUntilReady(6000); } catch (_) {}

    // Prefer Cordova geolocation if available
    const hasCordovaGeo = typeof navigator !== 'undefined' && navigator.geolocation && window.cordova;
    const position = await new Promise((resolve, reject) => {
      const opts = { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 };
      if (hasCordovaGeo) {
        navigator.geolocation.getCurrentPosition(resolve, reject, opts);
      } else if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(resolve, reject, opts);
      } else {
        reject(new Error('Geolocation not available'));
      }
    });

    const { latitude: lat, longitude: lng } = position.coords || {};
    if (typeof lat === 'number' && typeof lng === 'number') {
      // Persist numeric coordinates for API usage
      latitude.value = lat;
      longitude.value = lng;
      currentLocation.value = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
      locationVerified.value = true;
    } else {
      currentLocation.value = 'Location unavailable';
      locationVerified.value = false;
    }
  } catch (error) {
    // Retry once quickly if the first attempt failed and Cordova just became ready
    try {
      await new Promise(r => setTimeout(r, 300));
      const secondTry = await cordovaIntegration.getCurrentLocation();
      if (secondTry && typeof secondTry.latitude === 'number' && typeof secondTry.longitude === 'number') {
        latitude.value = secondTry.latitude;
        longitude.value = secondTry.longitude;
        currentLocation.value = `Lat: ${secondTry.latitude.toFixed(4)}, Lng: ${secondTry.longitude.toFixed(4)}`;
        locationVerified.value = true;
        return;
      }
    } catch (_) {}

    // Fallback to last known position if available
    const last = cordovaIntegration?.currentPosition;
    if (last && typeof last.latitude === 'number' && typeof last.longitude === 'number') {
      latitude.value = last.latitude;
      longitude.value = last.longitude;
      currentLocation.value = `Lat: ${last.latitude.toFixed(4)}, Lng: ${last.longitude.toFixed(4)}`;
      locationVerified.value = true;
      return;
    }

    // Friendly error messages by code
    const code = error && typeof error.code === 'number' ? error.code : null;
    if (code === 1) {
      currentLocation.value = 'Location permission denied. Enable permissions and tap Refresh.';
    } else if (code === 3) {
      currentLocation.value = 'Location timeout. Ensure GPS is on and tap Refresh.';
    } else {
      currentLocation.value = 'Location unavailable. Enable GPS and tap Refresh.';
    }
    locationVerified.value = false;
  }
};

// Build payload for clock actions including coordinates when available
const buildClockPayload = () => {
  const payload = {};
  if (typeof latitude.value === 'number' && typeof longitude.value === 'number') {
    payload.latitude = latitude.value;
    payload.longitude = longitude.value;
    payload.gps_verified = true;
  } else if (props.locationEnabled) {
    // Inform server that GPS was requested but not available
    payload.gps_verified = false;
  }
  return payload;
};

const toggleClock = async () => {
  isLoading.value = true;
  
  try {
    const prev = isClockedIn.value;
    if (isClockedIn.value) {
      // Start refreshing location in background if needed (don't block clock-out)
      if (props.locationEnabled && (!latitude.value || !longitude.value)) {
        getCurrentLocation().catch(() => {});
      }
      // Emit payload with current (possibly last-known) location; parent will call API
      const payload = buildClockPayload();
      emit('clock-out', payload);
      // Optionally refresh activity in the background
      loadRecentActivity().catch(() => {});
    } else {
      // Emit clock-in immediately (parent handles API)
      emit('clock-in');
    }
    // Wait for server status to flip, then force a full page reload for consistency
    waitForStatusChangeAndReload(prev).catch(() => {
      // Fallback: soft refresh status so UI isn't stale if reload fails
      fetchTimeStatus().catch(() => {});
    });
  } catch (error) {
    console.error('Clock toggle failed:', error);
  } finally {
    isLoading.value = false;
  }
};

// Real API: Load recent activity from /time-tracking/entries (fallback to /time/entries)
const loadRecentActivity = async () => {
  activityLoading.value = true;
  activityError.value = '';
  try {
    // Try to request a small page (API may ignore params; we'll still slice locally)
    const res = await apiService.getTimeEntries({ page: 1, limit: 10 });
    const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);

    // Map time entries into in/out events
    const events = [];
    for (const entry of list) {
      const inTs = entry.clock_in || entry.clock_in_time || entry.start_time || entry.started_at;
      const outTs = entry.clock_out || entry.clock_out_time || entry.end_time || entry.ended_at;
      if (inTs) {
        const d = new Date(inTs);
        events.push({ id: `${entry.id || inTs}-in`, type: 'in', date: formatDateLabel(d), time: formatTime(d), ts: d.getTime() });
      }
      if (outTs) {
        const d = new Date(outTs);
        events.push({ id: `${entry.id || outTs}-out`, type: 'out', date: formatDateLabel(d), time: formatTime(d), ts: d.getTime() });
      }
    }

    // Sort desc by timestamp and keep latest 8 events
    events.sort((a, b) => b.ts - a.ts);
    recentActivity.value = events.slice(0, 8);
  } catch (err) {
    console.error('Failed to load recent activity:', err);
    activityError.value = err?.message || 'Failed to load activity';
  } finally {
    activityLoading.value = false;
  }
};

const formatTime = (d) => d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
const formatDateLabel = (d) => {
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  const isSameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (isSameDay(d, today)) return 'Today';
  if (isSameDay(d, yest)) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Fetch current time tracking status from API
async function fetchTimeStatus() {
  try {
    const res = await apiService.getTimeStatus();
    const data = res?.data ?? res ?? {};

    // Determine clocked-in boolean
    isClockedIn.value = Boolean(
      data.is_clocked_in ?? data.clocked_in ?? (data.status === 'clocked_in') ?? false
    );

    // Extract clock-in timestamp
    const inTs = data.clock_in_time || data.clock_in || data.started_at || data.start_time;
    if (inTs) {
      const d = new Date(inTs);
      clockInAt.value = formatTime(d);
    } else {
      clockInAt.value = '';
    }

    // Work time today: accept seconds, minutes, or a formatted string
    const wt = data.work_time_today ?? data.total_seconds_today ?? data.total_minutes_today;
    workTimeTodayText.value = formatDuration(wt);
  } catch (err) {
    // Keep previous displayed values; optionally log
    console.warn('Failed to fetch time status:', err);
  }
}

function formatDuration(value) {
  if (value == null) {
    return workTimeTodayText.value || '0:00';
  }
  // If already a string like "1:23" or "01:23:45", return as-is
  if (typeof value === 'string') return value;
  // If it's a number, assume seconds if >= 3600, else minutes if < 3600 but > 120? Safer: prefer seconds, but accept minutes via heuristic flag
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return '0:00';
  // Heuristic: if n > 600, likely seconds; else could be minutes; we'll try seconds first
  const seconds = n > 600 ? n : (n <= 24 * 60 ? n * 60 : n);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  // Show H:MM
  return `${h}:${String(m).padStart(2, '0')}`;
}

// Poll status until it changes from previous state, then reload the page
async function waitForStatusChangeAndReload(prevState) {
  const started = Date.now();
  const timeoutMs = 7000; // max wait 7s
  const intervalMs = 500; // poll every 0.5s

  // Do an immediate fetch attempt first
  await fetchTimeStatus();
  if (isClockedIn.value !== prevState) {
    persistRefreshTarget('clock');
    safeReload();
    return;
  }

  // Continue polling until change or timeout
  while (Date.now() - started < timeoutMs) {
    await new Promise(r => setTimeout(r, intervalMs));
    try {
      await fetchTimeStatus();
      if (isClockedIn.value !== prevState) {
        persistRefreshTarget('clock');
        safeReload();
        return;
      }
    } catch (_) {
      // Ignore transient errors and continue
    }
  }
  // Timeout fallback: force reload anyway to avoid stale UI
  persistRefreshTarget('clock');
  safeReload();
}

function safeReload() {
  try {
    // In Cordova WebView this reloads the current www index
    window.location.reload();
  } catch (_) {
    // Secondary fallback via hard navigation
    try { window.location.assign(window.location.href); } catch (_) {}
  }
}

function persistRefreshTarget(viewId) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('mobile.refreshTarget', JSON.stringify({ view: viewId, at: Date.now() }));
    }
  } catch (_) {}
}
</script>

<style scoped>
/* Custom animations */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Touch feedback */
.mobile-clock-widget button:active {
  transform: scale(0.98);
  transition: transform 0.1s;
}
</style>
