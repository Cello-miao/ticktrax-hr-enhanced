<template>
  <div class="mobile-app min-h-screen bg-background">
    <!-- Mobile Header -->
    <header class="mobile-header sticky top-0 z-50 bg-background border-b px-4 py-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <!-- Menu Toggle for Mobile -->
          <!-- <Button 
            variant="ghost" 
            size="sm" 
            @click="toggleSidebar" 
            class="md:hidden"
          >
            <Menu class="h-5 w-5" />
          </Button> -->
          
          <!-- App Logo -->
          <div class="flex items-center gap-2">
            <div class="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Clock class="h-4 w-4 text-primary-foreground" />
            </div>
            <span class="font-semibold text-lg">TICKTRAX</span>
          </div>
        </div>
        
        <!-- Header Actions -->
        <div class="flex items-center gap-2">
          <!-- Theme Toggle -->
          <ThemeToggle />
          
          <!-- Profile Menu -->
          <Button variant="ghost" size="sm" @click="$emit('profileClick')">
            <User class="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>

    <!-- Temporary debug button: always visible on mobile to force-open the sidebar -->
    <Button
      variant="secondary"
      size="sm"
      class="fixed bottom-6 right-4 z-60 md:hidden"
      @click="sidebarOpen = true"
      title="Open menu (debug)"
    >
      Menu (DBG)
    </Button>

    <!-- Mobile Sidebar Overlay -->
       <!-- <div
      v-if="sidebarOpen"
      class="fixed inset-0 z-40 bg-black/50 md:hidden"
      role="button"
      aria-label="Close menu"
      tabindex="0"
      @click="closeSidebar('overlay')"
      @pointerdown="closeSidebar('overlay')"
      @touchstart.prevent="closeSidebar('overlay')"
    ></div> -->

    <!-- Sidebar Panel -->
    <!-- <aside
      v-if="sidebarOpen"
      :style="asideStyle"
      class="fixed left-0 top-0 bottom-0 z-50 w-72 bg-background md:hidden overflow-auto"
      @click.stop
    > -->
      <!-- Sidebar Header -->
      <!-- <div class="p-4 border-b">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <component :is="currentConfig.icon" class="h-6 w-6 text-primary" />
            <span class="font-semibold">{{ currentConfig.title }}</span>
          </div>
          <Button variant="ghost" size="sm" @click="closeSidebar('header')">
            <X class="h-4 w-4" />
          </Button>
        </div>
      </div> -->
      
      <!-- Navigation Menu -->
      <!-- <ScrollArea class="flex-1 p-4">
        <nav class="space-y-2">
          <Button
            v-for="item in currentConfig.menuItems"
            :key="item.id"
            :variant="currentView === item.id ? 'default' : 'ghost'"
            class="w-full justify-start gap-3 h-12"
            @click="handleNavigation(item.id)"
          >
            <component :is="item.icon" class="h-5 w-5" />
            {{ item.label }}
          </Button>
        </nav>
      </ScrollArea> -->
      
      <!-- Sidebar Footer -->
      <!-- <div class="p-4 border-t">
        <div class="space-y-2">
          <div class="text-sm text-muted-foreground">
            Logged in as: {{ userName }}
          </div>
          <Button 
            variant="outline" 
            class="w-full gap-2" 
            @click="$emit('logout')"
          >
            <LogOut class="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </aside> -->

    <!-- Main Content Area -->
    <main class="mobile-main flex-1 pb-16 md:pb-4">
      <div class="container max-w-full px-4 py-4">
        <slot />
      </div>
    </main>

    <!-- Mobile Bottom Navigation -->
    <nav class="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-30 bg-background border-t md:hidden">
      <div class="flex items-center justify-around px-2 py-2">
        <Button
          v-for="item in quickNavItems"
          :key="item.id"
          :variant="currentView === item.id ? 'default' : 'ghost'"
          size="sm"
          class="flex-col gap-1 h-12 min-w-0 flex-1"
          @click="handleNavigation(item.id)"
        >
          <component :is="item.icon" class="h-4 w-4" />
          <span class="text-xs truncate">{{ item.shortLabel || item.label }}</span>
        </Button>
      </div>
    </nav>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { 
  Clock, Users, FileText, Settings, Home, Calendar, TrendingUp, 
  Shield, Bell, HelpCircle, LogOut, User, Menu, X 
} from 'lucide-vue-next';
import ThemeToggle from '../ThemeToggle.vue';
import Badge from '../ui/badge.vue';
import Button from '../ui/button.vue';
import ScrollArea from '../ui/scroll-area.vue';

const props = defineProps({
  currentRole: String,
  userName: String,
  notifications: { type: Number, default: 0 },
  currentView: String
});

const emit = defineEmits(['update:currentView', 'logout', 'profileClick']);

const sidebarOpen = ref(false);

// Shared admin-like menu for admin/HR
const adminMenuItems = [
  //{ icon: Home, label: "Dashboard", id: "dashboard", shortLabel: "Home" },
  { icon: Users, label: "Employee Management", id: "employees", shortLabel: "Staff" }
  //{ icon: TrendingUp, label: "Analytics", id: "analytics", shortLabel: "Analytics" }
];

const roleConfig = {
  employee: {
    title: "Employee Portal",
    icon: Clock,
    menuItems: [
      //{ icon: Home, label: "Dashboard", id: "dashboard", shortLabel: "Home" },
      { icon: Clock, label: "Clock In/Out", id: "clock", shortLabel: "Clock" },
      { icon: FileText, label: "Time Management", id: "timesheet", shortLabel: "Time" },
      { icon: TrendingUp, label: "My Reports", id: "reports", shortLabel: "Reports" },
      { icon: HelpCircle, label: "Help Center", id: "help", shortLabel: "Help" },
    ],
  },
  manager: {
    title: "Manager Portal",
    icon: Users,
    menuItems: [
      { icon: Home, label: "Dashboard", id: "dashboard", shortLabel: "Home" },
      { icon: TrendingUp, label: "Reports", id: "reports", shortLabel: "Reports" },
      { icon: Users, label: "Team Overview", id: "team", shortLabel: "Team" },
      //{ icon: FileText, label: "Approvals", id: "approvals", shortLabel: "Approvals" },
      //{ icon: Bell, label: "Alerts", id: "alerts", shortLabel: "Alerts" },
      //{ icon: HelpCircle, label: "Help Center", id: "help", shortLabel: "Help" },
    ],
  },
  admin: {
    title: "Admin Portal",
    icon: Shield,
    menuItems: adminMenuItems,
  },
  hr: {
    title: "HR Portal",
    icon: Shield,
    menuItems: adminMenuItems,
  },
};

// Resolve role case-insensitively and alias common variants
const currentRoleKey = computed(() => String(props.currentRole || '').toLowerCase());
const currentConfig = computed(() => {
  const key = currentRoleKey.value;
  const normalized = key === 'administrator' ? 'admin' : key;
  return roleConfig[normalized] || roleConfig.employee;
});

// Quick navigation items for bottom nav (max 5 items)
const quickNavItems = computed(() => {
  const items = currentConfig.value.menuItems.slice(0, 5);
  return items;
});

const toggleSidebar = () => {
  // debug: log when toggle is called and the resulting state
  sidebarOpen.value = !sidebarOpen.value;
  console.debug('[MobileLayout] toggleSidebar called, sidebarOpen =', sidebarOpen.value);
};

const closeSidebar = (source = 'unknown') => {
  // debug: log when sidebar is closed and where the action originated
  sidebarOpen.value = false;
  console.debug('[MobileLayout] closeSidebar called, source =', source, 'sidebarOpen =', sidebarOpen.value);
};

onMounted(() => {
  // Build marker — helps verify the running WebView is using this exact source version
  console.info('[MobileLayout] mounted - buildMarker=mobile-layout-v2');
});

// Visual debug style for the aside to surface z-index/transform issues.
const asideStyle = computed(() => {
  if (!sidebarOpen.value) return {};
  return {
    transform: 'translateX(0) !important',
    outline: '3px solid rgba(220, 38, 38, 0.9)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
    zIndex: '99999'
  };
});

const REFRESHABLE_VIEWS = new Set(['dashboard','clock','timesheet','schedule','reports']);

const handleNavigation = (viewId) => {
  // Emit navigation first so any listeners can respond
  emit('update:currentView', viewId);
  closeSidebar('nav');

  // If this is one of the main bottom nav items, trigger a full refresh
  if (REFRESHABLE_VIEWS.has(viewId)) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('mobile.refreshTarget', JSON.stringify({ view: viewId, at: Date.now() }));
      }
    } catch (_) {}
    // Give the event loop a tick to process the state change, then reload
    setTimeout(() => {
      try { window.location.reload(); } catch (_) {
        try { window.location.assign(window.location.href); } catch (_) {}
      }
    }, 80);
  }
};
</script>

<style scoped>
.mobile-app {
  /* Ensure full height on mobile */
  min-height: 100vh;
  min-height: 100dvh; /* Dynamic viewport height for mobile browsers */
}

.mobile-header {
  /* Safe area for notched devices */
  padding-top: max(12px, env(safe-area-inset-top));
}

.mobile-main {
  /* Account for header and bottom nav */
  padding-top: 0;
  padding-bottom: calc(64px + env(safe-area-inset-bottom));
}

.mobile-bottom-nav {
  /* Safe area for home indicator */
  padding-bottom: env(safe-area-inset-bottom);
}

/* Touch-friendly button sizes */
@media (max-width: 768px) {
  .mobile-bottom-nav button {
    min-height: 48px;
    min-width: 48px;
  }
}

/* Smooth transitions */
.mobile-app * {
  -webkit-tap-highlight-color: transparent;
}
</style>
