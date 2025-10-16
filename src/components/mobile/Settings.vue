<template>
  <div class="p-4">
    <h2 class="text-xl font-semibold mb-4">Settings</h2>

    <div class="grid gap-3">
      <Card class="p-3">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium">Notifications</div>
            <div class="text-sm text-muted-foreground">Enable push notifications for important updates</div>
          </div>
          <input type="checkbox" v-model="notificationsEnabled" />
        </div>
      </Card>

      <Card class="p-3">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium">Theme</div>
            <div class="text-sm text-muted-foreground">Switch between light and dark</div>
          </div>
          <select v-model="theme">
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </div>
      </Card>

      <Card class="p-3">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium">Sign out of all devices</div>
            <div class="text-sm text-muted-foreground">Revoke active sessions</div>
          </div>
          <Button size="sm" variant="destructive" @click="signOutAll">Sign out</Button>
        </div>
      </Card>
    </div>
  </div>
</template>

<script setup>
console.debug('[Settings] module loaded');
import { ref, onMounted } from 'vue';
import Card from '../ui/card.vue';
import Button from '../ui/button.vue';
import { apiService } from '../../services/apiService.js';
import { useToast } from '../ui/toast/use-toast.js';

const { toast } = useToast();
const notificationsEnabled = ref(true);
const theme = ref('system');

const signOutAll = () => {
  console.debug('[Settings] signOutAll');
  // Placeholder: no endpoint defined; show a non-blocking toast
  toast.success('Sign-out requested');
};

onMounted(() => {
  console.debug('[Settings] mounted');
});
</script>

<style scoped>
</style>
