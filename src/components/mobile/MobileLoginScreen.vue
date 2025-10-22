<template>
  <div class="mobile-login min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center p-4">
    <div class="w-full max-w-sm space-y-6">
      <!-- App Branding -->
      <div class="text-center space-y-4">
        <div class="flex items-center justify-center">
          <div class="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <Clock class="h-8 w-8 text-primary-foreground" />
          </div>
        </div>
        <div>
          <h1 class="text-3xl font-bold tracking-tight">TICKTRAX</h1>
          <p class="text-muted-foreground mt-2">Mobile Time Tracking</p>
        </div>
      </div>

      <!-- Login Form -->
      <Card class="shadow-xl border-0">
        <CardContent class="space-y-6 p-6">
          <!-- Email Input (username removed) -->
          <div class="space-y-2">
            <Label for="email">Email</Label>
            <Input 
              id="email"
              type="email"
              placeholder="you@example.com"
              v-model="email"
              class="h-12 text-base"
              inputmode="email"
              autocomplete="username"
              @keydown.enter="handleLogin"
            />
          </div>

          <!-- Password Input -->
          <div class="space-y-2">
            <Label for="password">Password</Label>
            <div class="relative">
              <Input 
                id="password" 
                :type="showPassword ? 'text' : 'password'" 
                placeholder="Enter password" 
                v-model="password"
                class="h-12 text-base pr-12"
                autocomplete="current-password"
                @keydown.enter="handleLogin"
              />
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                class="absolute right-0 top-0 h-12 w-12"
                @click="showPassword = !showPassword"
              >
                <EyeOff v-if="showPassword" class="h-5 w-5" />
                <Eye v-else class="h-5 w-5" />
              </Button>
            </div>
          </div>

          <!-- Error Message -->
          <Alert v-if="error" variant="destructive" class="text-sm">
            <AlertTriangle class="h-4 w-4" />
            {{ error }}
          </Alert>

          <!-- Login Button -->
          <Button 
            class="w-full h-12 text-base font-semibold" 
            @click="handleLogin" 
            :disabled="isLoading || !email || !password"
          >
            <Loader2 v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
            {{ isLoading ? 'Signing In...' : 'Sign In' }}
          </Button>

          <!-- Biometric Login (placeholder - requires backend support) -->
          <!-- <div v-if="biometricSupported" class="text-center">
            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <span class="w-full border-t" />
              </div>
              <div class="relative flex justify-center text-xs uppercase">
                <span class="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>
            <Button 
              variant="outline" 
              class="w-full mt-4 h-12"
              @click="handleBiometricLogin"
            >
              <Fingerprint class="mr-2 h-5 w-5" />
              Use Biometric Login
            </Button>
          </div> -->

          <!-- Forgot Password -->
          <!-- <div class="text-center">
            <Button variant="link" class="text-sm text-muted-foreground">
              Forgot password?
            </Button>
          </div> -->
        </CardContent>
      </Card>

      <!-- Demo Accounts removed for production -->

      <!-- Network Status -->
      <div class="text-center">
        <div class="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <div :class="[
            'w-2 h-2 rounded-full',
            networkStatus === 'online' ? 'bg-green-500' : 
            networkStatus === 'offline' ? 'bg-red-500' : 'bg-yellow-500'
          ]" />
          <span>
            {{ networkStatus === 'online' ? 'Connected' : 
               networkStatus === 'offline' ? 'Offline Mode' : 'Connecting...' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import Card from '../ui/card.vue';
import { CardContent } from '../ui/card-components.vue';
import Button from '../ui/button.vue';
import Input from '../ui/input.vue';
import Label from '../ui/label.vue';
import Alert from '../ui/alert.vue';
import { 
  Clock, Eye, EyeOff, Loader2, AlertTriangle, 
  Fingerprint 
} from 'lucide-vue-next';
import authManager from '../../services/authService.js';

const emit = defineEmits(['login']);
 
const email = ref("");
const password = ref("");
const showPassword = ref(false);
const error = ref("");
const isLoading = ref(false);
const networkStatus = ref("online");
const biometricSupported = ref(false);

// Check for biometric support
// onMounted allows us to run code when the component is mounted
onMounted(async () => {
  // Check if we're in a mobile environment with biometric capabilities
  if ('PublicKeyCredential' in window && 'authenticatorAttachment' in PublicKeyCredential.prototype) {
    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      biometricSupported.value = available;
    } catch (err) {
      biometricSupported.value = false;
    }
  }

  // Monitor network status
  const updateNetworkStatus = () => {
    networkStatus.value = navigator.onLine ? 'online' : 'offline';
  };

  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  updateNetworkStatus();
});

const handleLogin = async () => {
  if (!email.value || !password.value) {
    error.value = "Please enter both email and password";
    return;
  }

  error.value = "";
  isLoading.value = true;
  
  try {
    const result = await authManager.login(email.value, password.value);
    
    if (result.success) {
      // Store credentials for biometric login if supported
      if (biometricSupported.value) {
        localStorage.setItem('last_login_user', email.value);
      }
      // Normalize user display name across mock and real API shapes
      let displayName = '';
      const user = result.user || result.data || {};

      if (user.first_name || user.last_name) {
        displayName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
      } else if (user.name) {
        displayName = user.name;
      } else if (user.email) {
        displayName = user.email;
      } else {
        displayName = email.value;
      }

      const role = user.role || (result.role || 'employee');

      emit('login', displayName, role);
    } else {
      error.value = result.error || "Invalid credentials";
    }
  } catch (err) {
    if (networkStatus.value === 'offline') {
      error.value = "No network connection. Please check your internet and try again.";
    } else {
      error.value = "Login failed. Please try again.";
    }
  } finally {
    isLoading.value = false;
  }
};

const handleBiometricLogin = async () => {
  if (!biometricSupported.value) return;
  
  try {
    isLoading.value = true;
    
    // Placeholder: integrate with platform authenticator / passkeys when backend is ready
    const lastUser = localStorage.getItem('last_login_user');
    if (!lastUser) {
      error.value = "Biometric login is not configured yet.";
    } else {
      error.value = "Biometric login requires server-side setup.";
    }
  } catch (err) {
    error.value = "Biometric authentication failed";
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.mobile-login {
  /* Ensure full height on mobile */
  min-height: 100vh;
  min-height: 100dvh;
  
  /* Safe areas for notched devices */
  padding-top: max(16px, env(safe-area-inset-top));
  padding-bottom: max(16px, env(safe-area-inset-bottom));
  padding-left: max(16px, env(safe-area-inset-left));
  padding-right: max(16px, env(safe-area-inset-right));
}

/* Touch-friendly input styling */
@media (max-width: 768px) {
  input[type="email"],
  input[type="text"],
  input[type="password"] {
    font-size: 16px; /* Prevents zoom on iOS */
  }
}
</style>
