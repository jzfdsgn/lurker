<!--
  Copyright (c) 2026 Brad Root
  SPDX-License-Identifier: Elastic-2.0
-->

<template>
  <div class="modal" @click.self="$emit('close')" @keydown.esc="$emit('close')">
    <div class="card" tabindex="-1" ref="cardEl">
      <header class="head">
        <h2>{{ label }}</h2>
        <button class="link" @click="$emit('close')" title="close"><i class="fa-solid fa-xmark"></i></button>
      </header>
      <div class="body">
        <p v-if="!topic" class="empty">No topic set.</p>
        <p v-else class="topic-text"><LinkedText :text="topic" /></p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import LinkedText from './LinkedText.vue';

defineProps({
  topic: { type: String, default: '' },
  label: { type: String, default: '' },
});
defineEmits(['close']);

const cardEl = ref(null);
onMounted(() => {
  cardEl.value?.focus();
});
</script>

<style scoped>
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.card {
  background: var(--bg);
  border: 1px solid var(--accent);
  width: min(720px, 90vw);
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  outline: none;
}
.head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}
.head h2 {
  margin: 0;
  flex: 1;
  color: var(--accent);
  font-weight: 600;
  text-transform: lowercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.link {
  background: none;
  border: none;
  color: var(--fg-muted);
  cursor: pointer;
  font: inherit;
  padding: 0 4px;
}
.link:hover { color: var(--fg); }

.body {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}
.topic-text {
  margin: 0;
  color: var(--fg);
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.55;
}
.empty {
  margin: 0;
  text-align: center;
  color: var(--fg-muted);
  font-style: italic;
}
</style>
