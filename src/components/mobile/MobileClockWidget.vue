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

      <!-- Offline queued notice -->
      <div v-if="offlineNotice" class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
        {{ offlineNotice }}
      </div>

      <!-- Sync pending bar -->
      <div v-if="pendingCount > 0" class="flex items-center justify-between text-xs bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
        <div class="text-blue-800">
          Sync pending: <strong>{{ pendingCount }}</strong>
        </div>
        <div class="flex items-center gap-2">
          <span v-if="!isOnlineNow" class="text-blue-600">Waiting for connection…</span>
          <Button size="sm" variant="secondary" class="h-7 px-2 py-1" :disabled="!isOnlineNow || isFlushing" @click="syncNow">
            <Loader2 v-if="isFlushing" class="h-3.5 w-3.5 animate-spin" />
            <span v-else>Sync now</span>
          </Button>
        </div>
      </div>

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
    <!-- <Card v-if="locationEnabled">
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
            <Button 
              v-if="locationPermission === 'denied'"
              size="sm"
              variant="secondary"
              class="ml-2"
              @click="ensureGeoPermission"
            >
              Grant Permission
            </Button>
            <Button
              size="sm"
              variant="ghost"
              class="ml-2"
              @click="openGpsSettings"
            >
              GPS Settings
            </Button>
          </div>
        </div>
        <div class="text-sm text-muted-foreground">
          {{ currentLocation || 'Getting location...' }}
        </div>
        <div class="mt-2 text-[11px] text-muted-foreground">
          <div>Permission: <strong>{{ locationPermission }}</strong></div>
          <div>GPS Enabled: <strong>{{ gpsEnabled ? 'yes' : 'no' }}</strong></div>
        </div>
      </CardContent>
    </Card> -->
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
import { fetchTimeStatusCached, fetchTimeEntriesCached, setPendingLocalStatus } from '../../services/offline/offlineService.js';
import { enqueueAction, flushQueue, peekQueue } from '../../services/offline/offlineQueue.js';

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
const isFlushing = ref(false);
const currentLocation = ref('');
const locationVerified = ref(false);
const locationPermission = ref('unknown'); // 'unknown' | 'granted' | 'denied'
const gpsEnabled = ref(true);
// Persist numeric coordinates for API payloads
const latitude = ref(null);
const longitude = ref(null);
// Offline UX state
const pendingCount = ref(0);
const offlineNotice = ref('');
const isOnlineNow = ref(typeof navigator !== 'undefined' ? navigator.onLine : true);

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
let handleOnline = null;
let handleOffline = null;

onMounted(() => {
  updateTime();
  timeInterval = setInterval(updateTime, 1000);
  // Initialize with prop for immediate UI, then refresh from API
  isClockedIn.value = !!props.clockedIn;
  fetchTimeStatus().catch(() => {});
  // Periodically refresh status while on screen
  statusInterval = setInterval(() => fetchTimeStatus().catch(() => {}), 60_000);
  
  if (props.locationEnabled) {
    // Request runtime permission when available, then attempt location
    ensureGeoPermission().then(() => {
      getCurrentLocation();
    }).catch(() => {
      // Even if permission flow failed, still try so user gets a clear error
      getCurrentLocation();
    });
    // Also check GPS enabled status (non-blocking)
    cordovaIntegration.isLocationEnabled().then((v) => { gpsEnabled.value = !!v; }).catch(() => {});
    // Auto-retry once after a short delay if we still don't have a fix
    setTimeout(() => {
      if (!latitude.value || !longitude.value) {
        getCurrentLocation().catch(() => {});
      }
    }, 2500);
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

  // Initialize pending count and online status listeners
  updatePendingCount();
  handleOnline = () => { isOnlineNow.value = true; updatePendingCount(); };
  handleOffline = () => { isOnlineNow.value = false; };
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
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
  if (handleOnline) window.removeEventListener('online', handleOnline);
  if (handleOffline) window.removeEventListener('offline', handleOffline);
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

const openGpsSettings = () => {
  try { cordovaIntegration.openLocationSettings(); } catch (_) {}
};

const ensureGeoPermission = async () => {
  try {
    const granted = await cordovaIntegration.requestLocationPermission();
    locationPermission.value = granted ? 'granted' : 'denied';
    return granted;
  } catch (_) {
    locationPermission.value = 'unknown';
    return false;
  }
};

const getCurrentLocation = async () => {
  try {
    // Ensure Cordova ready and permissions
    try { await cordovaIntegration.waitUntilReady(6000); } catch (_) {}
    await ensureGeoPermission();

    // Use best-effort helper which tries high/low accuracy and last-known
    const loc = await cordovaIntegration.getBestEffortLocation();
    if (loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
      latitude.value = loc.latitude;
      longitude.value = loc.longitude;
      currentLocation.value = `Lat: ${loc.latitude.toFixed(4)}, Lng: ${loc.longitude.toFixed(4)}`;
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
      locationPermission.value = 'denied';
      currentLocation.value = 'Location permission denied. Tap Grant Permission and then Refresh.';
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
    // Capture the exact intended click timestamp in ISO for server and local pending cache
    const clickIso = new Date().toISOString();
    if (isClockedIn.value) {
      // Start refreshing location in background if needed (don't block clock-out)
      if (props.locationEnabled && (!latitude.value || !longitude.value)) {
        getCurrentLocation().catch(() => {});
      }
      // Emit payload with current (possibly last-known) location; parent will call API
      const payload = buildClockPayload();
      // Try online first; if offline, enqueue
      if (navigator.onLine) {
        try { await apiService.clockOut({ ...payload, occurred_at: clickIso }); } catch (e) { enqueueAction({ type: 'CLOCK_OUT', payload: { ...payload, occurred_at: clickIso } }); setPendingLocalStatus('CLOCK_OUT', clickIso); showQueuedNotice(); }
      } else {
        enqueueAction({ type: 'CLOCK_OUT', payload: { ...payload, occurred_at: clickIso } });
        setPendingLocalStatus('CLOCK_OUT', clickIso);
        showQueuedNotice();
      }
      // Optimistic local toggle for offline
      if (!navigator.onLine) {
        isClockedIn.value = false;
      }
      emit('clock-out', payload);
      // Optionally refresh activity in the background
      loadRecentActivity().catch(() => {});
    } else {
      // Emit clock-in immediately for UI; then perform or enqueue
      emit('clock-in');
      const payload = buildClockPayload();
      if (navigator.onLine) {
        try { await apiService.clockIn({ ...payload, occurred_at: clickIso }); } catch (e) { enqueueAction({ type: 'CLOCK_IN', payload: { ...payload, occurred_at: clickIso } }); setPendingLocalStatus('CLOCK_IN', clickIso); showQueuedNotice(); }
      } else {
        enqueueAction({ type: 'CLOCK_IN', payload: { ...payload, occurred_at: clickIso } });
        setPendingLocalStatus('CLOCK_IN', clickIso);
        showQueuedNotice();
      }
      // Optimistic local toggle for offline
      if (!navigator.onLine) {
        isClockedIn.value = true;
      }
    }
    updatePendingCount();
    // Wait for server status to flip, then force a full page reload for consistency
    // If we queued actions and we're now online, attempt a quick flush with spinner
    try {
      if (navigator.onLine) {
        // Show native spinner during flush
        try { cordovaIntegration.spinner.show('Syncing...'); } catch (_) {}
        isFlushing.value = true;
        await flushQueue({ showSpinner: false });
      }
    } catch (_) { 
      // ignore
    } finally {
      isFlushing.value = false;
      try { cordovaIntegration.spinner.hide(); } catch (_) {}
    }
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

function updatePendingCount() {
  try {
    const q = peekQueue();
    pendingCount.value = Array.isArray(q) ? q.length : 0;
  } catch (_) {
    pendingCount.value = 0;
  }
}

let noticeTimer = null;
function showQueuedNotice() {
  offlineNotice.value = 'Action queued. It will sync when you are back online.';
  if (noticeTimer) clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { offlineNotice.value = ''; }, 4000);
}

async function syncNow() {
  if (!isOnlineNow.value || isFlushing.value) return;
  try { cordovaIntegration.spinner.show('Syncing...'); } catch (_) {}
  isFlushing.value = true;
  try {
    await flushQueue({ showSpinner: false });
    updatePendingCount();
    await fetchTimeStatus();
  } catch (_) {
    // keep banner; user can retry
  } finally {
    isFlushing.value = false;
    try { cordovaIntegration.spinner.hide(); } catch (_) {}
  }
}

// Fetch current time tracking status from API
async function fetchTimeStatus() {
  try {
    const { data } = await fetchTimeStatusCached();

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

// Real API: Load recent activity from /time-tracking/entries (fallback to /time/entries)
const loadRecentActivity = async () => {
  activityLoading.value = true;
  activityError.value = '';
  try {
    // Try cached+network hybrid
    const res = await fetchTimeEntriesCached({ page: 1, limit: 50 });
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
