<template>
  <div class="p-4">
    <h2 class="text-2xl font-bold mb-4">Help Center</h2>

    <Card class="mb-4">
      <CardContent>
        <h3 class="font-semibold mb-2">Frequently Asked Questions</h3>
        <ul class="space-y-3 text-sm text-muted-foreground">
          <li>
            <div class="font-medium">How do I clock in?</div>
            <div>Open the Time Clock and press the Clock In button.</div>
          </li>
          <!-- <li>
            <div class="font-medium">How do I request time off?</div>
            <div>Go to My Schedule and tap Request Time Off.</div>
          </li> -->
          <li>
            <div class="font-medium">Who do I contact for support?</div>
            <div>Email ticktrax@example.com.</div>
          </li>
        </ul>
      </CardContent>
    </Card>

    <!-- <div class="text-center mt-6">
      <Button @click="contactSupport">Contact Support</Button>
    </div> -->
  </div>
</template>

<script setup>
import Card from '../ui/card.vue';
import { CardContent } from '../ui/card-components.vue';
import Button from '../ui/button.vue';

// const contactSupport = () => {
//   // This is a stub — in the real app you might open an email client or support chat
//   alert('Opening support channel (demo)');
// };
</script>

<style scoped>
.text-muted-foreground { color: rgba(107,114,128,1); }
</style>
