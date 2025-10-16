<template>
  <div class="p-4">
    <h2 class="text-2xl font-bold mb-4">Alerts</h2>

    <Card class="mb-4">
      <CardContent>
        <div class="text-sm text-muted-foreground mb-3">System and team alerts</div>
        <ul class="space-y-3">
          <li v-for="alertItem in alertItems" :key="alertItem.id" class="flex items-start justify-between">
            <div>
              <div class="font-medium">{{ alertItem.title }}</div>
              <div class="text-xs text-muted-foreground">{{ alertItem.time }}</div>
            </div>
            <div class="text-sm text-primary font-semibold">{{ alertItem.severity }}</div>
          </li>
        </ul>
      </CardContent>
    </Card>

    <div class="text-center mt-6">
      <Button @click="refresh">Refresh</Button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import Card from '../ui/card.vue';
import { CardContent } from '../ui/card-components.vue';
import Button from '../ui/button.vue';
import { apiService } from '../../services/apiService.js';
import { useToast } from '../ui/toast/use-toast.js';

const { toast } = useToast();
const alertItems = ref([]);

// const refresh = async () => {
//   try {
//     const res = await apiService.listNotifications({ page: 1, limit: 20 }).catch(() => ({ data: [] }));
//     const arr = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
//     alertItems.value = arr.map((n) => ({
//       id: n.id,
//       title: n.title || n.message || 'Notification',
//       time: n.created_at || n.time || '',
//       severity: (n.severity || n.level || 'Info').toString()
//     }));
//   } catch (e) {
//     console.warn('[Alerts] refresh failed', e);
//     toast.error('Failed to load alerts');
//   }
// };

// onMounted(() => { refresh(); });
</script>

<style scoped>
.text-muted-foreground { color: rgba(107,114,128,1); }
</style>
