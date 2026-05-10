<template>
  <template v-for="(seg, i) in segments" :key="i">
    <a
      v-if="seg.url"
      class="msg-link"
      :href="seg.url"
      target="_blank"
      rel="noreferrer noopener"
    >{{ seg.text }}</a>
    <template v-else>{{ seg.text }}</template>
  </template>
</template>

<script setup>
import { computed } from 'vue';
import { splitTextByTokens } from '../utils/nickColor.js';

// Renders a plain-text string with URLs auto-linked. Used by every line type
// in MessageList that doesn't go through nick coloring (motd, errors, part
// reasons, etc.) and by the topic bar in Chat.vue. Lines that DO get nick
// coloring (message/notice/action) call splitTextByTokens directly with a
// real nickSet.
const props = defineProps({
  text: { type: String, default: '' },
});

const segments = computed(() => splitTextByTokens(props.text, null, null, null));
</script>
