<template>
  <div class="mobile-app-wrapper">
    <!-- Mobile Layout -->
    <div v-if="isMobile" class="mobile-view">
      <MobileLoginScreen 
        v-if="!user" 
        @login="handleLogin" 
      />
      
      <MobileLayout 
        v-else
        :current-role="user.role"
        :user-name="user.name"
        :notifications="notifications"
        :current-view="currentView"
        @update:current-view="updateCurrentView"
        @logout="handleLogout"
        @profileClick="showProfile = true"
      >
        <!-- Mobile Clock Widget for Clock View -->
        <MobileClockWidget 
          v-if="currentView === 'clock'"
          :clocked-in="clockedIn"
          :clock-in-time="clockInTime"
          :work-time-today="workTimeToday"
          :weekly-hours="weeklyHours"
          :monthly-hours="monthlyHours"
          :location-enabled="locationEnabled"
          @clock-in="handleClockIn"
          @clock-out="handleClockOut"
          @show-break-dialog="showBreakDialog = true"
          @show-timesheet="currentView = 'timesheet'"
        />
        
        <!-- Other mobile views -->
        <div v-else-if="currentView === 'dashboard'" class="mobile-dashboard">
          <h2 class="text-2xl font-bold mb-6">Dashboard</h2>
          <div class="grid gap-4">
            <Card class="p-4">
              <h3 class="font-semibold mb-2">Today's Summary</h3>
              <div class="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div class="text-2xl font-bold text-primary">{{ workTimeToday }}</div>
                  <div class="text-sm text-muted-foreground">Hours Worked</div>
                </div>
                <!-- <div>
                  <div class="text-2xl font-bold text-primary">{{ tasksCompleted }}</div>
                  <div class="text-sm text-muted-foreground">Tasks Done</div>
                </div> -->
              </div>
            </Card>
          </div>
        </div>

        <div v-else-if="currentView === 'timesheet' || currentView === 'timeManagement'">
          <TimeManagement />
        </div>

        <div v-else-if="currentView === 'schedule'">
          <MySchedule />
        </div>

        <div v-else-if="currentView === 'reports'">
          <MyReport />
        </div>

        <div v-else-if="currentView === 'help'">
          <HelpCenter />
        </div>

        <div v-else-if="currentView === 'alerts'">
          <Alerts />
        </div>

        <div v-else-if="currentView === 'team'">
          <TeamOverview />
        </div>

        <div v-else-if="currentView === 'employees'">
          <EmployeeManagement />
        </div>

        <div v-else-if="currentView === 'analytics'">
          <Analytics />
        </div>

        <div v-else-if="currentView === 'settings'">
          <Settings />
        </div>

        <div v-else class="mobile-view-placeholder">
          <div class="text-center py-12">
            <h3 class="text-lg font-semibold mb-2">{{ getViewTitle(currentView) }}</h3>
            <p class="text-muted-foreground">This view is being optimized for mobile.</p>
            <div class="mt-4 text-xs text-muted-foreground">currentView: <strong>{{ currentView }}</strong></div>
          </div>
        </div>
      </MobileLayout>
      
  <!-- Profile Modal -->
  <Profile 
    v-if="showProfile" 
    :user="userProfile || null" 
    @close="handleProfileClose" 
    @logout="handleProfileLogout" 
  />
    </div>

    <!-- Desktop Layout (fallback) -->
    <div v-else class="desktop-view">
      <DashboardLayout
        v-if="user"
        :current-role="user.role"
        :user-name="user.name"
        :notifications="notifications"
        :current-view="currentView"
        @update:current-view="currentView = $event"
        @logout="handleLogout"
        @profile-click="showProfile = true"
      >
        <slot />
      </DashboardLayout>
      
      <LoginScreen 
        v-else 
        @login="handleLogin" 
      />
    </div>

    <!-- PWA Install Prompt -->
    <div 
      v-if="showInstallPrompt && deferredPrompt" 
      class="fixed bottom-4 left-4 right-4 z-50 md:hidden"
    >
      <Card class="shadow-lg border-primary">
        <CardContent class="p-4">
          <div class="flex items-center justify-between">
            <div>
              <div class="font-medium">Install App</div>
              <div class="text-sm text-muted-foreground">Get the full mobile experience</div>
            </div>
            <div class="flex gap-2">
              <Button size="sm" @click="installPWA">Install</Button>
              <Button size="sm" variant="ghost" @click="dismissInstallPrompt">Later</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useToast } from '../ui/toast/use-toast.js';
import MobileLayout from './MobileLayout.vue';
import MobileLoginScreen from './MobileLoginScreen.vue';
import MobileClockWidget from './MobileClockWidget.vue';
import TimeManagement from './TimeManagement.vue';
import MySchedule from './MySchedule.vue';
import MyReport from './MyReport.vue';
import HelpCenter from './HelpCenter.vue';
import Alerts from './Alerts.vue';
import TeamOverview from './TeamOverview.vue';
import EmployeeManagement from './EmployeeManagement.vue';
import Analytics from './Analytics.vue';
import Settings from './Settings.vue';
import Profile from './Profile.vue';
import DashboardLayout from '../DashboardLayout.vue';
import LoginScreen from '../auth/LoginScreen.vue';
import Card from '../ui/card.vue';
import { CardContent } from '../ui/card-components.vue';
import Button from '../ui/button.vue';
import authManager from '../../services/authService.js';
import { apiService } from '../../services/apiService.js';
import cordovaIntegration from '../../services/cordovaIntegration.js';
import { computeAggregatesFromEntries } from '../../utils/timeUtils.js';

const { toast } = useToast();

const user = ref(null);
const userProfile = ref(null); // raw profile object (first_name, last_name, email, role)
const currentView = ref('dashboard');
const notifications = ref(0);
const showProfile = ref(false);
// Track last set to detect rapid unwanted overwrites
const lastSet = ref({ view: currentView.value, at: Date.now() });

// Mobile detection
const isMobile = ref(false);

// Clock state
const clockedIn = ref(false);
const clockInTime = ref('');
const workTimeToday = ref('0:00');
const weeklyHours = ref('0h');
const monthlyHours = ref('0h');
const locationEnabled = ref(true);
const tasksCompleted = ref(0);

// PWA install
const deferredPrompt = ref(null);
const showInstallPrompt = ref(false);

onMounted(() => {
  detectMobile(); // initial detection
  setupPWA();
  checkAuthState();
  // Restore target view after a reload triggered by bottom nav
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('mobile.refreshTarget') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.view === 'string') {
        currentView.value = parsed.view;
      }
      // clear after use
      localStorage.removeItem('mobile.refreshTarget');
    }
  } catch (_) {}
  
  // Listen for orientation changes
  window.addEventListener('orientationchange', detectMobile);
  window.addEventListener('resize', detectMobile);
});

// Expose a global flag so other parts of the app know they're running inside
// the mobile wrapper and shouldn't override navigation state.
if (typeof window !== 'undefined') {
  try {
    window.__isMobileWrapper = true;
  } catch (e) {
    // ignore
  }
}

const detectMobile = () => {
  const width = window.innerWidth;
  const userAgent = navigator.userAgent;
  
  // Detect mobile based on screen width and user agent
  isMobile.value = width <= 768 || 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
};

// Setup PWA install prompt handling
const setupPWA = () => {
  // Listen for PWA install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt.value = e;
    showInstallPrompt.value = true;
  });

  // Hide install prompt if app is already installed
  window.addEventListener('appinstalled', () => {
    showInstallPrompt.value = false;
    deferredPrompt.value = null;
  });
};

const checkAuthState = async () => {
  // Check if user is already authenticated
  if (authManager.isAuthenticated()) {
    const profile = await authManager.getUserProfile();
    if (profile) {
      userProfile.value = profile;
      user.value = {
        name: `${profile.first_name || profile.firstName || ''} ${profile.last_name || profile.lastName || ''}`.trim(),
        role: profile.role || 'employee'
      };
      // If no explicit refresh target set this session and currentView is still the default,
      // prefer showing Employees for admin users; otherwise keep existing behavior.
      try {
        const hasRefreshTarget = typeof localStorage !== 'undefined' && localStorage.getItem('mobile.refreshTarget');
        const roleLc = String(user.value.role || '').toLowerCase();
        if (!hasRefreshTarget && (!currentView.value || currentView.value === 'dashboard')) {
          if (roleLc === 'admin' || roleLc === 'hr' || roleLc === 'human resources') {
            currentView.value = 'employees';
          } else if (isMobile.value) {
            currentView.value = 'clock';
          }
        }
      } catch (_) {}
      // Ensure data like clockedIn/status/hours are loaded when session exists
      try {
        await loadMobileData();
      } catch (e) {
        console.warn('Auto-load mobile data failed:', e);
      }
    }
  }
};

const handleLogin = async (userName, role) => {
  console.log('📱 Mobile: Login successful', userName, role);
  user.value = { name: userName, role };
  // Default landing per role: admins go to Employees; others keep clock on mobile, dashboard on desktop
  const roleLc = String(role || '').toLowerCase();
  if (roleLc === 'admin' || roleLc === 'hr' || roleLc === 'human resources') {
    currentView.value = 'employees';
  } else {
    currentView.value = isMobile.value ? 'clock' : 'dashboard';
  }
  try {
    const hasRefreshTarget = typeof localStorage !== 'undefined' && localStorage.getItem('mobile.refreshTarget');
    if (!hasRefreshTarget) {
      toast.success(`Welcome back, ${userName}!`);
    }
  } catch (_) {}
  
  // Load initial data
  await loadMobileData();
};

// Small helper to refresh time status from API
const refreshTimeStatus = async () => {
  const statusRes = await apiService.getTimeStatus();
  if (statusRes) {
    // Use is_clocked_in from /time-tracking/status
    clockedIn.value = !!statusRes.is_clocked_in;
    if (statusRes.clock_in_time) {
      const time = new Date(statusRes.clock_in_time);
      clockInTime.value = time.toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      clockInTime.value = '';
    }
    // Set a baseline for today's hours; may be overridden by entries below
    const todayHours = Number(statusRes.total_hours_today || statusRes.hours_today || 0);
    workTimeToday.value = `${todayHours.toFixed(1)}`;
  }
};

// Refresh status whenever switching to Clock view
watch(currentView, async (next) => {
  if (next === 'clock') {
    try { await refreshTimeStatus(); } catch (e) { console.warn('Failed to refresh status on view change', e); }
  }
});

// Load mobile data from API
const loadMobileData = async () => {
  try {
    console.log('📱 Loading mobile data from API...');
    
    const userRes = await authManager.getCurrentUser();
    if (!userRes || !userRes.data) return;
    
    const userId = userRes.data.id;
    
    // Get clock status (uses is_clocked_in)
    await refreshTimeStatus();
    
    // Get time entries (real API) and compute hours in French time (Europe/Paris)
    try {
      const entriesRes = await apiService.getTimeEntries({ page: 1, limit: 200 });
      const agg = computeAggregatesFromEntries(entriesRes, new Date());
  weeklyHours.value = agg.formatHours1(agg.weekHours);
  monthlyHours.value = agg.formatHours1(agg.monthHours);
  // Override today's hours with entries-based calculation (Paris day overlap)
  workTimeToday.value = agg.formatHours1Raw(agg.todayHours);
    } catch (e) {
      console.warn('⚠️ Failed to compute hours from entries (FR time):', e);
    }

    // Notifications (unread count)
    try {
      const unreadRes = await apiService.getUnreadCount();
      notifications.value = Number(unreadRes?.count || unreadRes?.data?.count || 0);
    } catch (e) {
      console.warn('⚠️ Failed to load unread notifications:', e);
    }

    // Analytics overview to populate quick stat (tasks completed today if available)
    try {
      const analytics = await apiService.getAnalyticsOverview();
      tasksCompleted.value = Number(
        analytics?.tasks_completed_today ||
        analytics?.completed_tasks ||
        analytics?.metrics?.tasks_completed_today ||
        0
      );
    } catch (e) {
      console.warn('⚠️ Failed to load analytics overview:', e);
    }
    
    console.log('📱 Mobile data loaded successfully');
  } catch (error) {
    console.error('📱 Error loading mobile data:', error);
  }
};

const handleLogout = async () => {
  try {
    await authManager.logout();
    user.value = null;
    currentView.value = 'dashboard';
    toast.success('Logged out successfully');
  } catch (error) {
    console.error('Logout error:', error);
    toast.error('Logout failed');
  }
};

const handleProfileClose = () => {
  showProfile.value = false;
};

const handleProfileLogout = async () => {
  await handleLogout();
  showProfile.value = false;
};

const updateCurrentView = (view) => {
  const now = Date.now();
  console.debug('[MobileAppWrapper] updateCurrentView ->', view, '(' + (typeof view) + ', len=' + (view && view.length ? view.length : 0) + ')', 'prev=', currentView.value, 'lastSet=', lastSet.value);

  // If a rapid reset to 'dashboard' occurs within 800ms of the previous set and
  // the previous view wasn't 'dashboard', treat it as an accidental overwrite and ignore.
  if (
    view === 'dashboard' &&
    currentView.value &&
    currentView.value !== 'dashboard' &&
    now - lastSet.value.at < 800 &&
    lastSet.value.view !== 'dashboard'
  ) {
    console.debug('[MobileAppWrapper] Ignoring rapid dashboard overwrite (from', currentView.value, '->', view, ')');
    // update lastSet so future attempts are measured from now
    lastSet.value = { view, at: now };
    return;
  }

  // If the dashboard is being set programmatically (not user-intent), trace the call origin
  // if (view === 'dashboard' && currentView.value && currentView.value !== 'dashboard') {
  //   console.debug('[MobileAppWrapper] dashboard set programmatically? prev=', currentView.value, 'now=', now, 'lastSet=', lastSet.value);
  //   const err = new Error('[MobileAppWrapper] dashboard set - stack');
  //   console.error('[MobileAppWrapper] dashboard set programmatically. Stack below:');
  //   console.error(err.stack);
  //   // Also emit a console.trace for richer information in Chromium logcat
  //   try {
  //     console.trace();
  //   } catch (traceErr) {
  //     // ignore if console.trace is not available
  //   }
  //   // Expose the stack on window so it can be inspected from DevTools or other runtime probes
  //   if (typeof window !== 'undefined') {
  //     try {
  //       window.__lastDashboardStack = err.stack;
  //     } catch (werr) {
  //       // ignore write errors
  //     }
  //   }
  //   // Also persist to localStorage (so we can read it later if console gets noisy)
  //   try {
  //     if (typeof localStorage !== 'undefined') {
  //       localStorage.setItem('__lastDashboardStack', err.stack || '[no-stack]');
  //       // Print a short slice so logcat shows the most relevant top frames
  //       const stackLines = (err.stack || '').split('\n');
  //       console.error('[MobileAppWrapper] stack-snippet:', stackLines.slice(0,6).join(' | '));
  //       // Print top lines individually for clearer visibility in logcat
  //       stackLines.slice(0,8).forEach((ln, idx) => {
  //         console.error(`[MobileAppWrapper] stack-line[${idx}] ${ln}`);
  //       });
  //       try {
  //         localStorage.setItem('__lastDashboardStackLines', JSON.stringify(stackLines.slice(0,20)));
  //       } catch (sErr) {
  //         // ignore
  //       }
  //     }
  //   } catch (lsErr) {
  //     // ignore storage errors
  //   }
  // }

  // Accept the navigation
  currentView.value = view;
  lastSet.value = { view, at: now };
};

// Temporary global helper to force logout from a console or external script.
if (typeof window !== 'undefined') {
  // attach on window so you can call `window.forceLogout()` from DevTools
  window.forceLogout = async () => {
    try {
      await handleLogout();
      console.log('forceLogout: logout invoked');
    } catch (e) {
      console.error('forceLogout error', e);
    }
  };
}

// NOTE: The MobileClockWidget handles API/queue for clock-in itself to support offline mode.
// Keep this handler as a no-op to avoid duplicate records.
const handleClockIn = async () => {
  console.debug('[MobileAppWrapper] clock-in event received (handled by widget). No parent action.');
};

// NOTE: The MobileClockWidget handles API/queue for clock-out itself to support offline mode.
// Keep this handler as a no-op to avoid duplicate records.
const handleClockOut = async (_payload) => {
  console.debug('[MobileAppWrapper] clock-out event received (handled by widget). No parent action.');
};

const installPWA = async () => {
  if (deferredPrompt.value) {
    deferredPrompt.value.prompt();
    const { outcome } = await deferredPrompt.value.userChoice;
    
    if (outcome === 'accepted') {
      toast.success('App installed successfully!');
    }
    
    deferredPrompt.value = null;
    showInstallPrompt.value = false;
  }
};

const dismissInstallPrompt = () => {
  showInstallPrompt.value = false;
  localStorage.setItem('pwa-install-dismissed', Date.now().toString());
};

const getViewTitle = (view) => {
  const titles = {
    dashboard: 'Dashboard',
    clock: 'Time Clock',
    timesheet: 'Timesheet',
    schedule: 'Schedule',
    reports: 'Reports',
    team: 'Team',
    employees: 'Employees',
    settings: 'Settings',
    help: 'Help Center'
  };
  return titles[view] || view.charAt(0).toUpperCase() + view.slice(1);
};
</script>

<style scoped>
.mobile-app-wrapper {
  min-height: 100vh;
  min-height: 100dvh;
}

.mobile-view {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
}

.mobile-dashboard {
  padding: 1rem;
}

.mobile-view-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Smooth transitions */
.mobile-app-wrapper * {
  -webkit-tap-highlight-color: transparent;
}

/* Hide scrollbars on mobile for cleaner look */
@media (max-width: 768px) {
  ::-webkit-scrollbar {
    display: none;
  }
  
  * {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
}
</style>
