<template>
  <div class="p-4">
    <h2 class="text-2xl font-bold mb-4">Approvals</h2>

    <!-- <Card class="mb-4">
      <CardContent>
        <div class="text-sm text-muted-foreground mb-3">Pending approvals for your review</div>
        <ul class="space-y-3">
          <li v-for="item in approvals" :key="item.id" class="flex items-start justify-between gap-4">
            <div>
              <div class="font-medium">{{ item.title }}</div>
              <div class="text-xs text-muted-foreground">Submitted by {{ item.by }} • {{ item.date }}</div>
            </div>
            <div class="flex items-center gap-2">
              <Button size="sm" variant="ghost" @click="reject(item)">Reject</Button>
              <Button size="sm" @click="approve(item)">Approve</Button>
            </div>
          </li>
        </ul>
      </CardContent>
    </Card>

    <div class="text-center mt-6">
      <Button @click="loadMore">Load more</Button>
    </div> -->
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
const approvals = ref([]);
const page = ref(1);
const limit = ref(10);
const loading = ref(false);
const hasMore = ref(true);

const mapItem = (it) => ({
  id: it.id || it.entry_id || it.request_id || Math.random().toString(36).slice(2),
  title: it.title || it.reason || it.type || 'Approval Request',
  by: it.by || it.employee_name || it.user?.name || 'Unknown',
  date: it.date || it.created_at || it.submitted_at || new Date().toISOString().slice(0,10)
});

async function fetchApprovals(reset = false) {
  if (loading.value) return;
  loading.value = true;
  try {
    if (reset) { page.value = 1; hasMore.value = true; approvals.value = []; }
    if (!hasMore.value) return;
    const res = await apiService.getPendingApprovals({ page: page.value, limit: limit.value });
    const items = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
    const mapped = items.map(mapItem);
    approvals.value = approvals.value.concat(mapped);
    hasMore.value = mapped.length >= limit.value;
    page.value += 1;
  } catch (e) {
    console.error('[Approvals] fetch error', e);
    toast.error('Failed to load approvals');
  } finally {
    loading.value = false;
  }
}

const approve = (item) => {
  doAction(item, 'approve');
};

const reject = (item) => {
  doAction(item, 'reject');
};

async function doAction(item, action) {
  try {
    const id = item.id;
    if (!id) return;
    if (action === 'approve') {
      await apiService.approveTimeEntry(id, {});
      toast.success('Approved');
    } else {
      await apiService.rejectTimeEntry(id, { reason: 'Rejected from mobile' });
      toast.success('Rejected');
    }
    approvals.value = approvals.value.filter(a => a.id !== item.id);
  } catch (e) {
    console.error('[Approvals] action error', e);
    toast.error('Action failed');
  }
}

const loadMore = () => fetchApprovals(false);

onMounted(() => { fetchApprovals(true); });
</script>

<style scoped>
.text-muted-foreground { color: rgba(107,114,128,1); }
</style>
