<template>
  <div class="p-4">
    <h2 class="text-2xl font-bold mb-4">Team Overview</h2>

    <Card class="mb-4">
      <CardContent>
        <div class="flex items-center justify-between mb-3">
          <div>
            <div class="text-sm text-muted-foreground">Team Performance</div>
            <div class="text-2xl font-bold">{{ teamHours }}h</div>
          </div>
          <div class="text-right">
            <div class="text-sm text-muted-foreground">On Duty</div>
            <div class="text-2xl font-bold">{{ onDuty }}</div>
          </div>
        </div>

        <h4 class="font-medium mb-2">Members</h4>
        <ul class="space-y-3">
          <li v-for="member in members" :key="member.id" class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white">{{ member.initials }}</div>
              <div>
                <div class="font-medium">{{ member.name }}</div>
                <div class="text-xs text-muted-foreground">{{ member.role }}</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <Button size="sm" variant="ghost" @click="message(member)">Message</Button>
              <Button size="sm" @click="viewProfile(member)">View</Button>
            </div>
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
const teamHours = ref('0');
const onDuty = ref(0);

const members = ref([]);

const viewProfile = (m) => { toast.info(`Viewing ${m.name}`); };

const message = (m) => { toast.info(`Chat with ${m.name}`); };

const refresh = () => { loadTeam(); };

onMounted(() => { loadTeam(); });

async function loadTeam() {
  try {
    const users = await apiService.getTeamMembers().catch(() => ({ data: [] }));
    const arr = Array.isArray(users?.data) ? users.data : (Array.isArray(users) ? users : []);
    members.value = arr.map(u => ({
      id: u.id,
      name: u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
      role: u.role || 'Employee',
      initials: (u.first_name?.[0] || u.name?.[0] || 'U').toUpperCase() + (u.last_name?.[0] || '')
    }));
    const analytics = await apiService.getAnalyticsOverview().catch(() => ({}));
    const hours = Number(
      analytics?.team_hours ||
      analytics?.metrics?.team_hours || 0
    );
    const duty = Number(
      analytics?.on_duty ||
      analytics?.metrics?.on_duty || 0
    );
    teamHours.value = hours.toString();
    onDuty.value = duty;
  } catch (e) {
    console.warn('[TeamOverview] load failed', e);
  }
}
</script>

<style scoped>
.text-muted-foreground { color: rgba(107,114,128,1); }
</style>
