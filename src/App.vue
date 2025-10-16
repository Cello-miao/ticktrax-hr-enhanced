<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ThemeProvider } from './components/ThemeProvider.vue';
import MobileAppWrapper from './components/mobile/MobileAppWrapper.vue';
import LoginScreen from './components/auth/LoginScreen.vue';
import DashboardLayout from './components/DashboardLayout.vue';
import EmployeeDashboard from './components/dashboards/EmployeeDashboard.vue';
import ManagerDashboard from './components/dashboards/ManagerDashboard.vue';
import AdminDashboard from './components/dashboards/AdminDashboard.vue';
import HRDashboard from './components/dashboards/HRDashboard.vue';
import ProfileDialog from './components/dialogs/ProfileDialog.vue';
import Toaster from './components/ui/sonner.vue';
import { toast } from 'vue-sonner';
import authManager from './services/authService.js';
import mobileService from './services/mobileService.js';
import realTimeService from './services/realTimeService.js';
import './utils/apiTest.js'; // Auto-test API connection

const user = ref(null);
const currentView = ref("dashboard");
const isProfileOpen = ref(false);
const isMobileApp = ref(false);
const notificationCount = ref(0);

// Detect if we should use mobile layout
onMounted(() => {
  detectMobileEnvironment();
  
  // Listen for orientation changes
  window.addEventListener('orientationchange', detectMobileEnvironment);
  window.addEventListener('resize', detectMobileEnvironment);
  
  // Setup realtime notification listeners
  const handleNotificationsUpdated = (notifications) => {
    console.log('📡 App: Notifications updated', notifications);
    const unreadCount = notifications.filter(n => !n.read).length;
    notificationCount.value = unreadCount;
  };
  
  const handleNotification = (notification) => {
    console.log('📡 App: New notification', notification);
    notificationCount.value += 1;
    // Show toast for new notification
    toast.info(notification.message || 'New notification');
  };
  
  // Register listeners
  realTimeService.on('notifications-updated', handleNotificationsUpdated);
  realTimeService.on('notification', handleNotification);
  
  onUnmounted(() => {
    window.removeEventListener('orientationchange', detectMobileEnvironment);
    window.removeEventListener('resize', detectMobileEnvironment);
    realTimeService.off('notifications-updated', handleNotificationsUpdated);
    realTimeService.off('notification', handleNotification);
  });
});

const detectMobileEnvironment = () => {
  const width = window.innerWidth;
  const userAgent = navigator.userAgent;
  
  // Detect mobile based on screen width and user agent
  isMobileApp.value = width <= 768 || 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
};

const handleLogin = (name, role) => {
  console.log('🎯 App.vue handleLogin START');
  console.log('🎯 Received name:', name);
  console.log('🎯 Received role:', role, 'type:', typeof role);
  
  user.value = { name, role };
  
  console.log('🎯 user.value SET TO:', JSON.stringify(user.value));
  console.log('🎯 user.value.role:', user.value.role);
  
  setDashboard();
  
  console.log('🎯 After setDashboard, currentView:', currentView.value);
};

const handleLogout = async () => {
  try {
    await authManager.logout();
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    user.value = null;
    setDashboard();
    toast.success('Logged out successfully');
  }
};

const handleRoleChange = (newRole) => {
  if (user.value) {
    user.value = { ...user.value, role: newRole };
    setDashboard();
    toast.success(`Switched to ${newRole} role`);
  }
};

const handleProfileClick = () => {
  isProfileOpen.value = true;
};

const dashboardContent = computed(() => {
  console.log('🔄 dashboardContent computed() TRIGGERED');
  
  if (!user.value) {
    console.log('❌ No user, returning null');
    return null;
  }
  
  console.log('✅ user.value EXISTS:', JSON.stringify(user.value));
  
  // Normalize role to lowercase
  const role = (user.value.role || 'employee').toString().toLowerCase().trim();
  
  console.log('🎭 ROLE after normalization:', role);
  console.log('🎭 Role === "admin"?', role === 'admin');
  console.log('🎭 Role === "manager"?', role === 'manager');
  console.log('🎭 Role === "hr"?', role === 'hr');
  console.log('🎭 Role === "employee"?', role === 'employee');
  
  let component;
  let componentName;
  
  switch (role) {
    case "admin":
      component = AdminDashboard;
      componentName = 'AdminDashboard';
      break;
    case "manager":
      component = ManagerDashboard;
      componentName = 'ManagerDashboard';
      break;
    case "hr":
      component = HRDashboard;
      componentName = 'HRDashboard';
      break;
    case "employee":
      component = EmployeeDashboard;
      componentName = 'EmployeeDashboard';
      break;
    default:
      component = EmployeeDashboard;
      componentName = 'EmployeeDashboard (default)';
  }
  
  console.log('🎯 SELECTED COMPONENT:', componentName);
  return component;
});

// Helper to set dashboard with trace for debugging unexpected resets
const setDashboard = () => {
  // Don't override the mobile wrapper's internal navigation when running
  // as a mobile app — MobileAppWrapper manages its own currentView.
  if (isMobileApp.value) {
    console.debug('[App] setDashboard skipped because running as mobile app');
    return;
  }

  console.debug('[App] setDashboard called - setting currentView to "dashboard"');
  console.trace('[App] setDashboard stack trace');
  currentView.value = "dashboard";
};

// Check for existing authentication on app startup
onMounted(async () => {
  // Check for stored user data first
  const storedUser = localStorage.getItem('user_data');
  const shouldShowWelcomeToast = () => {
    try {
      // If mobile refresh was explicitly triggered (bottom nav or clock), skip welcome toast
      if (typeof localStorage !== 'undefined' && localStorage.getItem('mobile.refreshTarget')) {
        return false;
      }
    } catch (_) {}
    return true;
  };
  if (storedUser) {
    try {
      const userData = JSON.parse(storedUser);
      console.log('App.vue onMounted - found stored user:', userData);
      
      user.value = {
        name: userData.name || `${userData.first_name} ${userData.last_name}`.trim(),
        role: userData.role
      };
      
      console.log('App.vue onMounted - set user.value:', user.value);
      setDashboard();
      if (shouldShowWelcomeToast()) {
        toast.success('Welcome back!');
      }
      return;
    } catch (error) {
      console.log('Failed to parse stored user data:', error);
      localStorage.removeItem('user_data');
    }
  }
  
  // Only attempt backend authentication if we have a stored token but no user data
  const storedToken = localStorage.getItem('jwt_token');
  if (storedToken) {
    try {
      const userProfile = await authManager.getCurrentUser();
      if (userProfile && userProfile.success) {
        const userData = userProfile.data;
        user.value = {
          name: userData.name || `${userData.first_name} ${userData.last_name}`.trim(),
          role: userData.role
        };
        setDashboard();
        if (shouldShowWelcomeToast()) {
          toast.success('Welcome back!');
        }
      }
    } catch (error) {
      console.log('Backend authentication failed:', error);
      // Clear invalid tokens
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('csrf_token');
    }
  }
});
</script>

<template>
  <ThemeProvider>
    <!-- Mobile App Layout -->
    <MobileAppWrapper v-if="isMobileApp">
      <component
        :is="dashboardContent"
        :currentView="currentView"
        @update:currentView="currentView = $event"
        :currentRole="user?.role"
      />
    </MobileAppWrapper>

    <!-- Desktop Layout -->
    <div v-else>
      <div v-if="!user">
        <LoginScreen @login="handleLogin" />
      </div>
      <div v-else class="h-screen overflow-hidden">
        <DashboardLayout
          :currentRole="user.role"
          @update:currentRole="handleRoleChange"
          :userName="user.name"
          :notifications="notificationCount"
          :currentView="currentView"
          @update:currentView="currentView = $event"
          @logout="handleLogout"
          @profileClick="handleProfileClick"
        >
          <component
            :is="dashboardContent"
            :currentView="currentView"
            @update:currentView="currentView = $event"
            :currentRole="user.role"
          />
        </DashboardLayout>
      </div>
    </div>

    <!-- Profile Dialog (shared) -->
    <ProfileDialog
      v-if="user"
      :open="isProfileOpen"
      @update:open="isProfileOpen = $event"
      :user="{
        name: user.name,
        role: user.role,
        email: `${user.name.toLowerCase().replace(' ', '.')}@company.com`,
        phone: '+1 (555) 123-4567',
        department: 'Engineering',
        location: 'New York, NY',
        startDate: '2023-01-15',
        employeeId: 'EMP001',
      }"
    />
    
    <Toaster />
  </ThemeProvider>
</template>
