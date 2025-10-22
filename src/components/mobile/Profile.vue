<template>
  <div class="profile-modal fixed inset-0 z-60 flex items-center justify-center">
    <div class="bg-background p-4 rounded-lg shadow-lg w-11/12 max-w-md max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold">Profile</h3>
        <Button variant="ghost" size="sm" @click="$emit('close')">
          <X class="h-4 w-4" />
        </Button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-8">
        <div class="text-center">
          <Loader2 class="h-8 w-8 animate-spin mx-auto mb-2" />
          <p class="text-muted-foreground">Loading profile...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <div class="flex items-center gap-2">
          <AlertCircle class="h-4 w-4 text-red-500" />
          <p class="text-red-700">{{ error }}</p>
        </div>
        <Button @click="loadProfile" size="sm" variant="outline" class="mt-2">
          Try Again
        </Button>
      </div>

      <!-- Profile Content -->
      <div v-else class="space-y-4">
        <!-- Profile Picture -->
        <div class="flex justify-center mb-4">
          <div class="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
            <User v-if="!profile?.profile_picture" class="h-10 w-10 text-muted-foreground" />
            <img 
              v-else 
              :src="profile.profile_picture" 
              :alt="`${profile.first_name} ${profile.last_name}`"
              class="w-20 h-20 rounded-full object-cover"
            />
          </div>
        </div>

        <!-- Basic Info -->
        <div class="space-y-3">
          <div>
            <div class="text-sm text-muted-foreground">Name</div>
            <div class="font-medium">{{ profile?.first_name }} {{ profile?.last_name }}</div>
          </div>

          <div>
            <div class="text-sm text-muted-foreground">Email</div>
            <div class="font-medium">{{ profile?.email || '—' }}</div>
          </div>

          <!-- <div>
            <div class="text-sm text-muted-foreground">Username</div>
            <div class="font-medium">{{ profile?.username || '—' }}</div>
          </div> -->

          <!-- <div>
            <div class="text-sm text-muted-foreground">Role</div>
            <div class="font-medium">{{ roleLabel }}</div>
          </div> -->

          <div v-if="profile?.phone">
            <div class="text-sm text-muted-foreground">Phone</div>
            <div class="font-medium">{{ profile.phone }}</div>
          </div>

          <div v-if="profile?.department">
            <div class="text-sm text-muted-foreground">Department</div>
            <div class="font-medium">{{ profile.department }}</div>
          </div>

          <div v-if="profile?.employee_id">
            <div class="text-sm text-muted-foreground">Employee ID</div>
            <div class="font-medium">{{ profile.employee_id }}</div>
          </div>

          <div v-if="profile?.hire_date">
            <div class="text-sm text-muted-foreground">Hire Date</div>
            <div class="font-medium">{{ formatDate(profile.hire_date) }}</div>
          </div>
        </div>

        <!-- Stats Cards -->
        <!-- <div v-if="dashboard" class="grid grid-cols-2 gap-3 mt-4">
          <Card class="p-3">
            <div class="text-center">
              <div class="text-lg font-bold text-blue-600">{{ dashboard.total_hours || 0 }}</div>
              <div class="text-xs text-muted-foreground">Total Hours</div>
            </div>
          </Card>
          <Card class="p-3">
            <div class="text-center">
              <div class="text-lg font-bold text-green-600">{{ dashboard.clocked_in ? 'Yes' : 'No' }}</div>
              <div class="text-xs text-muted-foreground">Currently In</div>
            </div>
          </Card>
        </div> -->

        <!-- Action Buttons -->
        <!-- <div class="mt-6 space-y-2">
          <Button 
            @click="showEditProfile = true" 
            class="w-full" 
            :disabled="loading"
          >
            <Edit class="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
          
          <Button 
            @click="showChangePassword = true" 
            variant="outline" 
            class="w-full"
            :disabled="loading"
          >
            <Key class="h-4 w-4 mr-2" />
            Change Password
          </Button>
        </div> -->

        <!-- Bottom Actions -->
        <div class="mt-4 flex gap-2">
          <Button variant="outline" class="flex-1" @click="$emit('logout')" :disabled="loading">
            <LogOut class="h-4 w-4 mr-2" />
            Logout
          </Button>
          <Button class="flex-1" @click="$emit('close')" :disabled="loading">
            Close
          </Button>
        </div>
      </div>
    </div>

    <!-- Edit Profile Dialog -->
    <!-- <Dialog v-model:open="showEditProfile">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information
          </DialogDescription>
        </DialogHeader>
        <form @submit.prevent="updateProfile" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <Label for="firstName">First Name</Label>
              <Input 
                id="firstName" 
                v-model="editForm.first_name" 
                required 
                :disabled="updating"
              />
            </div>
            <div>
              <Label for="lastName">Last Name</Label>
              <Input 
                id="lastName" 
                v-model="editForm.last_name" 
                required 
                :disabled="updating"
              />
            </div>
          </div>
          <div>
            <Label for="phone">Phone</Label>
            <Input 
              id="phone" 
              v-model="editForm.phone" 
              type="tel"
              :disabled="updating"
            />
          </div>
          <div>
            <Label for="profilePicture">Profile Picture URL</Label>
            <Input 
              id="profilePicture" 
              v-model="editForm.profile_picture" 
              type="url"
              :disabled="updating"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" @click="showEditProfile = false" :disabled="updating">
              Cancel
            </Button>
            <Button type="submit" :disabled="updating">
              <Loader2 v-if="updating" class="h-4 w-4 animate-spin mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog> -->

    <!-- Change Password Dialog -->
    <!-- <Dialog v-model:open="showChangePassword">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>
            Enter your current password and new password
          </DialogDescription>
        </DialogHeader>
        <form @submit.prevent="changePassword" class="space-y-4">
          <div>
            <Label for="currentPassword">Current Password</Label>
            <Input 
              id="currentPassword" 
              v-model="passwordForm.current_password" 
              type="password"
              required 
              :disabled="changingPassword"
            />
          </div>
          <div>
            <Label for="newPassword">New Password</Label>
            <Input 
              id="newPassword" 
              v-model="passwordForm.new_password" 
              type="password"
              required 
              :disabled="changingPassword"
            />
          </div>
          <div>
            <Label for="confirmPassword">Confirm New Password</Label>
            <Input 
              id="confirmPassword" 
              v-model="passwordForm.confirm_password" 
              type="password"
              required 
              :disabled="changingPassword"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" @click="showChangePassword = false" :disabled="changingPassword">
              Cancel
            </Button>
            <Button type="submit" :disabled="changingPassword">
              <Loader2 v-if="changingPassword" class="h-4 w-4 animate-spin mr-2" />
              Change Password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog> -->
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import Button from '../ui/button.vue';
import Card from '../ui/card.vue';
import Input from '../ui/input.vue';
import Label from '../ui/label.vue';
import Dialog, { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog.vue';
import { 
  X, Loader2, AlertCircle, User, Edit, Key, LogOut 
} from 'lucide-vue-next';
import { apiService } from '../../services/apiService.js';
import { toast } from '../../utils/toast.js';

const props = defineProps({ user: Object });
const emit = defineEmits(['close', 'logout']);

// Reactive state
const profile = ref(null);
const dashboard = ref(null);
const loading = ref(false);
const error = ref('');
const updating = ref(false);
const changingPassword = ref(false);
const roles = ref([]);

// Dialog states
const showEditProfile = ref(false);
const showChangePassword = ref(false);

// Form data
const editForm = ref({
  first_name: '',
  last_name: '',
  phone: '',
  profile_picture: ''
});

const passwordForm = ref({
  current_password: '',
  new_password: '',
  confirm_password: ''
});

// Utility functions
const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Load user profile from API
const loadProfile = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    console.debug('[Profile] Loading user profile...');
    const response = await apiService.getUserProfile();
    profile.value = response?.data || response;
    
    // Initialize edit form with current data
    if (profile.value) {
      editForm.value = {
        first_name: profile.value.first_name || '',
        last_name: profile.value.last_name || '',
        phone: profile.value.phone || '',
        profile_picture: profile.value.profile_picture || ''
      };
    }
    
    console.debug('[Profile] Profile loaded:', profile.value);
  } catch (err) {
    console.error('[Profile] Error loading profile:', err);
    error.value = err?.message || 'Failed to load profile';
  } finally {
    loading.value = false;
  }
};

// Load user dashboard data
const loadDashboard = async () => {
  try {
    console.debug('[Profile] Loading user dashboard...');
    const response = await apiService.getUserDashboard();
    dashboard.value = response?.data || response;
    console.debug('[Profile] Dashboard loaded:', dashboard.value);
  } catch (err) {
    console.error('[Profile] Error loading dashboard:', err);
    // Don't show error for dashboard as it's not critical
  }
};

// Load roles for lookup (used when only role_id is present)
const loadRoles = async () => {
  try {
    const response = await apiService.listRoles();
    const roleData = response?.data || response || [];
    roles.value = Array.isArray(roleData) ? roleData : [];
  } catch (err) {
    // non-critical; ignore
    roles.value = [];
  }
};

// Helpers for role display
const toTitle = (s) => {
  if (!s || typeof s !== 'string') return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const resolveRoleName = (p) => {
  if (!p) return 'Employee';
  // embedded object
  if (p.role && typeof p.role === 'object' && p.role.name) return p.role.name;
  // plain string role
  if (typeof p.role === 'string') {
    const raw = p.role.trim();
    const lc = raw.toLowerCase();
    if (lc === 'hr' || lc === 'human resources') return 'HR';
    if (lc === 'admin' || lc === 'administrator') return 'Admin';
    return toTitle(raw);
  }
  // role_name field
  if (p.role_name) {
    const raw = String(p.role_name);
    const lc = raw.toLowerCase();
    if (lc === 'hr' || lc === 'human resources') return 'HR';
    if (lc === 'admin' || lc === 'administrator') return 'Admin';
    return toTitle(raw);
  }
  // role_id lookup if roles loaded
  if (p.role_id && Array.isArray(roles.value)) {
    const found = roles.value.find(r => r.id === p.role_id || String(r.id) === String(p.role_id));
    if (found?.name) return found.name;
  }
  // roles array on profile
  if (Array.isArray(p.roles) && p.roles.length > 0) {
    const first = p.roles[0];
    if (typeof first === 'string') {
      const lc = first.toLowerCase();
      if (lc === 'hr' || lc === 'human resources') return 'HR';
      if (lc === 'admin' || lc === 'administrator') return 'Admin';
      return toTitle(first);
    }
    if (first?.name) return first.name;
  }
  return 'Employee';
};

const roleLabel = computed(() => resolveRoleName(profile.value));

// Update user profile
const updateProfile = async () => {
  if (updating.value) return;
  
  updating.value = true;
  try {
    console.debug('[Profile] Updating profile...');
    
    const payload = {
      first_name: editForm.value.first_name,
      last_name: editForm.value.last_name,
      phone: editForm.value.phone,
      profile_picture: editForm.value.profile_picture
    };
    
    const response = await apiService.updateUserProfile(payload);
    const updatedProfile = response?.data || response;
    
    if (updatedProfile) {
      profile.value = { ...profile.value, ...updatedProfile };
    }
    
    showEditProfile.value = false;
    toast.success('Profile updated successfully');
    console.debug('[Profile] Profile updated:', updatedProfile);
  } catch (err) {
    console.error('[Profile] Error updating profile:', err);
    toast.error(`Failed to update profile: ${err?.message || 'Unknown error'}`);
  } finally {
    updating.value = false;
  }
};

// Change password
const changePassword = async () => {
  if (changingPassword.value) return;
  
  // Validate passwords match
  if (passwordForm.value.new_password !== passwordForm.value.confirm_password) {
    toast.error('New passwords do not match');
    return;
  }
  
  // Validate password length
  if (passwordForm.value.new_password.length < 6) {
    toast.error('New password must be at least 6 characters long');
    return;
  }
  
  changingPassword.value = true;
  try {
    console.debug('[Profile] Changing password...');
    
    const payload = {
      current_password: passwordForm.value.current_password,
      new_password: passwordForm.value.new_password,
      confirm_password: passwordForm.value.confirm_password
    };
    
    await apiService.changePassword(payload);
    
    // Reset form
    passwordForm.value = {
      current_password: '',
      new_password: '',
      confirm_password: ''
    };
    
    showChangePassword.value = false;
    toast.success('Password changed successfully');
    console.debug('[Profile] Password changed successfully');
  } catch (err) {
    console.error('[Profile] Error changing password:', err);
    const message = err?.message?.toLowerCase() || '';
    const friendly = message.includes('current') ? 'Current password is incorrect'
                  : message.includes('match') ? 'Passwords do not match'
                  : message.includes('length') ? 'Password is too short'
                  : 'Failed to change password';
    toast.error(friendly);
  } finally {
    changingPassword.value = false;
  }
};

// Watch for user prop changes (if passed from parent)
watch(() => props.user, (newUser) => {
  if (newUser && !profile.value) {
    profile.value = newUser;
  }
}, { immediate: true });

// Initialize component
onMounted(async () => {
  console.debug('[Profile] mounted');
  
  // Seed with provided user (may be partial), then always fetch fresh profile + dashboard
  if (props.user) {
    profile.value = props.user;
  }
  await Promise.all([
    loadProfile(),
    loadDashboard(),
    loadRoles()
  ]);
});
</script>

<style scoped>
.profile-modal { background: rgba(0,0,0,0.4); }
</style>
