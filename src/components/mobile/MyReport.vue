<template>
  <div class="p-4">
    <h2 class="text-2xl font-bold mb-4">My Report</h2>

    <Card class="mb-4">
      <CardContent>
        <h3 class="font-semibold mb-2">This Month</h3>
        <div class="grid grid-cols-2 gap-4 text-center mb-4">
          <div>
            <div class="text-3xl font-bold">{{ hoursThisMonth }}</div>
            <div class="text-sm text-muted-foreground">Hours</div>
          </div>
          <div>
            <div class="text-3xl font-bold">{{ daysWorked }}</div>
            <div class="text-sm text-muted-foreground">Days Worked</div>
          </div>
        </div>

        <h4 class="font-medium mb-2">Recent Notes</h4>
        <ul class="space-y-2 text-sm text-muted-foreground">
          <li v-for="note in notes" :key="note.id">{{ note.text }}</li>
        </ul>
      </CardContent>
    </Card>

    <div class="text-center mt-6">
      <Button @click="exportReport">Export PDF</Button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import Card from '../ui/card.vue';
import { CardContent } from '../ui/card-components.vue';
import Button from '../ui/button.vue';
import { apiService } from '../../services/apiService.js';
import { computeAggregatesFromEntries, countDaysWorkedInMonthParis } from '../../utils/timeUtils.js';
import { useToast } from '../ui/toast/use-toast.js';

const { toast } = useToast();
const hoursThisMonth = ref('0h');
const daysWorked = ref(0);
const notes = ref([]);

const exportReport = () => {
  // Hook up to reports export endpoint when ready
  toast.success('Export requested');
};

onMounted(async () => {
  try {
    const res = await apiService.getTimeEntries({ page: 1, limit: 500 });
    const entries = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
    const agg = computeAggregatesFromEntries(entries);
    hoursThisMonth.value = `${agg.monthHours.toFixed(1)}h`;
    daysWorked.value = countDaysWorkedInMonthParis(entries);
    notes.value = entries.slice(0, 3).map((e, i) => ({ id: i+1, text: `Entry ${i+1} • ${e.clock_in || e.start_time || 'N/A'}` }));
  } catch (e) {
    console.warn('[MyReport] load failed', e);
  }
});
</script>

<style scoped>
.text-muted-foreground { color: rgba(107,114,128,1); }
</style>
