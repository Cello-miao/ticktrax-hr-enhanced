<template>
  <div class="p-3 sm:p-4">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg sm:text-xl font-semibold">Employee Management</h2>
      <!-- <Button @click="refreshEmployees" :disabled="loading" size="sm" variant="outline">
        <RefreshCw v-if="loading" class="h-4 w-4 animate-spin" />
        <RefreshCw v-else class="h-4 w-4" />
        Refresh
      </Button> -->
    </div>

    <!-- Loading State -->
    <div v-if="loading && employees.length === 0" class="flex items-center justify-center py-8">
      <div class="text-center">
        <Loader2 class="h-8 w-8 animate-spin mx-auto mb-2" />
        <p class="text-muted-foreground">Loading employees...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div class="flex items-center gap-2">
        <AlertCircle class="h-4 w-4 text-red-500" />
        <p class="text-red-700">{{ error }}</p>
      </div>
      <Button @click="loadEmployees" size="sm" variant="outline" class="mt-2">
        Try Again
      </Button>
    </div>

    <!-- Empty State -->
    <div v-else-if="employees.length === 0" class="text-center py-8">
      <Users class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <p class="text-muted-foreground">No employees found</p>
    </div>

    <!-- Employees List -->
    <div v-else class="grid gap-3">
      <Card v-for="emp in employees" :key="emp.id" class="p-3 sm:p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <div class="font-medium text-base sm:text-lg leading-tight">
              {{ emp.first_name }} {{ emp.last_name }}
            </div>
            <div class="text-xs sm:text-sm text-muted-foreground truncate max-w-[70vw]">
              {{ emp.email }}
            </div>
            <div class="text-xs text-muted-foreground mt-1">
              Role: {{ roleName(emp) }}
            </div>
            <!-- <div class="flex items-center gap-2 mt-1">
              <Badge :variant="isActiveToday(emp) ? 'default' : 'secondary'" class="text-[10px] sm:text-xs">
                {{ isActiveToday(emp) ? 'Active' : 'Inactive' }}
              </Badge>
              <Badge v-if="emp.is_admin" variant="destructive" class="text-[10px] sm:text-xs">
                Admin
              </Badge>
            </div> -->
          </div>
        </div>
      </Card>
    </div>

    <!-- Add Employee Button -->
    <!-- <div class="mt-6">
      <Button @click="showAddEmployee = true" class="w-full" :disabled="loading">
        <Plus class="h-4 w-4 mr-2" />
        Add Employee
      </Button>
    </div> -->

    <!-- Add Employee Dialog -->
    <Dialog v-model:open="showAddEmployee">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Employee</DialogTitle>
          <DialogDescription>
            Create a new employee account
          </DialogDescription>
        </DialogHeader>
        <form @submit.prevent="addEmployee" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label for="firstName">First Name</Label>
              <Input 
                id="firstName" 
                v-model="newEmployee.first_name" 
                required 
                :disabled="addingEmployee"
              />
            </div>
            <div>
              <Label for="lastName">Last Name</Label>
              <Input 
                id="lastName" 
                v-model="newEmployee.last_name" 
                required 
                :disabled="addingEmployee"
              />
            </div>
          </div>
          <div>
            <Label for="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              v-model="newEmployee.email" 
              required 
              :disabled="addingEmployee"
            />
          </div>
          <div>
            <Label for="username">Username</Label>
            <Input 
              id="username" 
              v-model="newEmployee.username" 
              required 
              :disabled="addingEmployee"
            />
          </div>
          <div>
            <Label for="password">Password</Label>
            <Input 
              id="password" 
              type="password" 
              v-model="newEmployee.password" 
              required 
              :disabled="addingEmployee"
            />
          </div>
          <div>
            <Label for="role">Role</Label>
            <Select v-model="newEmployee.role_id" :disabled="addingEmployee">
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="role in roles" :key="role.id" :value="role.id">
                  {{ role.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <!-- <DialogFooter>
            <Button type="button" variant="outline" @click="showAddEmployee = false" :disabled="addingEmployee">
              Cancel
            </Button>
            <Button type="submit" :disabled="addingEmployee">
              <Loader2 v-if="addingEmployee" class="h-4 w-4 animate-spin mr-2" />
              Add Employee
            </Button>
          </DialogFooter> -->
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup>
console.debug('[EmployeeManagement] module loaded');
import { ref, onMounted, computed } from 'vue';
import Card from '../ui/card.vue';
import Button from '../ui/button.vue';
import Badge from '../ui/badge.vue';
import Input from '../ui/input.vue';
import Label from '../ui/label.vue';
import Dialog, { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog.vue';
import Select, { SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select.vue';
import { 
  RefreshCw, Loader2, AlertCircle, Users, Plus 
} from 'lucide-vue-next';
import { apiService } from '../../services/apiService.js';
import { toast } from '../../utils/toast.js';

// Reactive state
const employees = ref([]);
const roles = ref([]);
const loading = ref(false);
const error = ref('');
const showAddEmployee = ref(false);
const addingEmployee = ref(false);

// New employee form data
const newEmployee = ref({
  first_name: '',
  last_name: '',
  email: '',
  username: '',
  password: '',
  role_id: null
});

// Computed properties (reserved for future use)
const activeEmployees = computed(() => employees.value.filter(emp => emp.active));
const inactiveEmployees = computed(() => employees.value.filter(emp => !emp.active));

// Helper: Get role name from various possible shapes
const roleName = (emp) => {
  // Prefer embedded role object
  if (emp?.role?.name) return emp.role.name;
  // If role is a plain string
  if (typeof emp?.role === 'string') {
    const raw = emp.role.trim();
    const lc = raw.toLowerCase();
    if (lc === 'hr' || lc === 'human resources') return 'HR';
    if (lc === 'administrator') return 'Admin';
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }
  // Fallback: some APIs return role_name directly
  if (emp?.role_name) return emp.role_name;
  // Fallback: lookup by role_id from loaded roles
  if (emp?.role_id && Array.isArray(roles.value)) {
    const found = roles.value.find(r => r.id === emp.role_id || r.id === String(emp.role_id));
    if (found?.name) return found.name;
  }
  // Fallback: roles array on user
  if (Array.isArray(emp?.roles) && emp.roles.length > 0) {
    const first = emp.roles[0];
    if (typeof first === 'string') return first;
    if (first?.name) return first.name;
  }
  return 'No role assigned';
};

// Track users who clocked in today
const activeTodaySet = ref(new Set());

// Normalize and extract a user id from an employee object
const getEmpId = (emp) => {
  const id = emp?.id ?? emp?.user_id ?? emp?.userId ?? emp?.userID ?? emp?.user?.id ?? null;
  if (id == null) return null;
  // use string for stable Set membership
  return String(id);
};

// Compute whether the given employee has clocked in today
const isActiveToday = (emp) => {
  const id = getEmpId(emp);
  if (id == null) return false;
  return activeTodaySet.value.has(id);
};

// Load employees from API
const loadEmployees = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    console.debug('[EmployeeManagement] Loading employees...');
    const response = await apiService.listUsers();
    
    // Handle different response formats
    const employeeData = response?.data || response || [];
    employees.value = Array.isArray(employeeData) ? employeeData : [];
    
    console.debug('[EmployeeManagement] Loaded employees:', employees.value.length);
  } catch (err) {
    console.error('[EmployeeManagement] Error loading employees:', err);
    error.value = err?.message || 'Failed to load employees';
    employees.value = [];
  } finally {
    loading.value = false;
  }
};

// Load roles from API
const loadRoles = async () => {
  try {
    console.debug('[EmployeeManagement] Loading roles...');
    const response = await apiService.listRoles();
    const roleData = response?.data || response || [];
    roles.value = Array.isArray(roleData) ? roleData : [];
    console.debug('[EmployeeManagement] Loaded roles:', roles.value.length);
  } catch (err) {
    console.error('[EmployeeManagement] Error loading roles:', err);
    // Don't show error for roles as it's not critical
  }
};

// Refresh employees
const refreshEmployees = () => {
  Promise.all([loadEmployees(), loadActiveToday()]).catch(() => {});
};

// Removed: profile view, activate/deactivate, and delete actions for mobile UI simplification

// Add new employee
const addEmployee = async () => {
  if (addingEmployee.value) return;
  
  addingEmployee.value = true;
  try {
    console.debug('[EmployeeManagement] Adding new employee...');
    
    const payload = {
      user: {
        first_name: newEmployee.value.first_name,
        last_name: newEmployee.value.last_name,
        email: newEmployee.value.email,
        username: newEmployee.value.username,
        password: newEmployee.value.password,
        role_id: newEmployee.value.role_id
      }
    };
    
    const response = await apiService.createUser(payload);
    const newEmp = response?.data || response;
    
    // Add to local state
    if (newEmp) {
      employees.value.unshift(newEmp);
    }
    
    // Reset form
    newEmployee.value = {
      first_name: '',
      last_name: '',
      email: '',
      username: '',
      password: '',
      role_id: null
    };
    
    showAddEmployee.value = false;
    toast.success('Employee added successfully');
    console.debug('[EmployeeManagement] Employee added:', newEmp);
  } catch (err) {
    console.error('[EmployeeManagement] Error adding employee:', err);
    toast.error(`Failed to add employee: ${err?.message || 'Unknown error'}`);
  } finally {
    addingEmployee.value = false;
  }
};

// Load set of users who clocked in today
const loadActiveToday = async () => {
  try {
    // Request entries for today's date range; any returned entry counts as active
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const startDate = startOfDay.toISOString().split('T')[0];
    const endDate = endOfDay.toISOString().split('T')[0];

    const res = await apiService.getTimeEntries({ start_date: startDate, end_date: endDate, limit: 5000 });
    const raw = res?.data || res || [];
    const entries = Array.isArray(raw) ? raw : (Array.isArray(raw?.entries) ? raw.entries : []);

    const getUserIdFromEntry = (e) => e.user_id ?? e.userId ?? e.userID ?? e.user?.id ?? e.uid ?? null;

    const set = new Set();
    for (const entry of entries) {
      const uid = getUserIdFromEntry(entry);
      if (uid != null) set.add(String(uid));
    }
    activeTodaySet.value = set; // replace to trigger reactivity
  } catch (e) {
    // Non-fatal; leave set empty on failure
    console.warn('[EmployeeManagement] Failed to load active-today set:', e);
    activeTodaySet.value = new Set();
  }
};

// Initialize component
onMounted(async () => {
  console.debug('[EmployeeManagement] mounted');
  await Promise.all([
    loadEmployees(),
    loadRoles(),
    loadActiveToday()
  ]);
});
</script>

<style scoped>
/* small layout niceties */
</style>
