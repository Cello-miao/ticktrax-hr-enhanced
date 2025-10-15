<template>
  <div class="p-4">
    <h2 class="text-2xl font-bold mb-4">My Schedule</h2>

    <Card class="mb-4">
      <CardContent>
        <ul class="space-y-3">
          <li v-for="item in schedule" :key="item.id" class="flex justify-between items-center">
            <div>
              <div class="font-medium">{{ item.day }}</div>
              <div class="text-xs text-muted-foreground">{{ item.time }}</div>
            </div>
            <div class="text-right text-sm">{{ item.location }}</div>
          </li>
        </ul>
      </CardContent>
    </Card>

    <div class="text-center mt-6">
      <Button variant="outline" @click="requestTimeOff">Request Time Off</Button>
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
const schedule = ref([]);
const loading = ref(false);
const error = ref('');

const requestTimeOff = async () => {
  // Placeholder: connect to an actual time-off endpoint when available
  toast.success('Time off request submitted');
};

onMounted(() => { loadSchedule(); });

async function loadSchedule() {
  loading.value = true;
  error.value = '';
  try {
    // Reuse reports/schedules API if available; otherwise show empty state
    const res = await apiService.listSchedules().catch(() => null);
    const items = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
    schedule.value = items.map((it, idx) => ({
      id: it.id || idx,
      day: it.day || it.weekday || new Date(it.date || Date.now()).toLocaleDateString('en-US', { weekday: 'long' }),
      time: it.time_range || `${it.start || '09:00'} - ${it.end || '17:00'}`,
      location: it.location || it.site || 'Office'
    }));
  } catch (e) {
    console.warn('[MySchedule] load failed', e);
    schedule.value = [];
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.text-muted-foreground { color: rgba(107,114,128,1); }
</style>
