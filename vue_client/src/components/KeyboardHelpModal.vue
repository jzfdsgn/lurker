<!--
  Copyright (c) 2026 Brad Root
  SPDX-License-Identifier: Elastic-2.0
-->

<template>
  <div class="modal" @click.self="$emit('close')" @keydown.esc="$emit('close')">
    <div class="card" tabindex="-1" ref="cardEl">
      <header class="head">
        <h2>keyboard shortcuts</h2>
        <button class="link" @click="$emit('close')" title="close"><i class="fa-solid fa-xmark"></i></button>
      </header>
      <table class="list">
        <tbody>
          <tr v-for="row in shortcuts" :key="row.label">
            <td class="keys">
              <span v-for="(k, i) in row.keys" :key="i">
                <kbd>{{ k }}</kbd>
                <span v-if="i < row.keys.length - 1" class="plus">+</span>
              </span>
            </td>
            <td class="label">{{ row.label }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';

defineEmits(['close']);

const cardEl = ref(null);

const isMac = typeof navigator !== 'undefined'
  && /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent || '');
const MOD = isMac ? '⌘' : 'Ctrl';
const ALT = isMac ? '⌥' : 'Alt';

const shortcuts = computed(() => [
  { keys: [MOD, 'K'],            label: 'Jump to channel (quick switcher)' },
  { keys: [ALT, '↑'],            label: 'Previous channel (current network)' },
  { keys: [ALT, '↓'],            label: 'Next channel (current network)' },
  { keys: [ALT, 'Shift', '↑'],   label: 'Previous unread channel' },
  { keys: [ALT, 'Shift', '↓'],   label: 'Next unread channel' },
  { keys: ['Shift', 'Esc'],      label: 'Mark all channels read' },
  { keys: ['Tab'],               label: 'Autocomplete nicks and channels' },
  { keys: ['↑', '↓'],            label: 'Browse input history' },
  { keys: [MOD, '/'],            label: 'Show this help panel' },
]);

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
  width: min(520px, 92vw);
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

.list {
  width: 100%;
  border-collapse: collapse;
  overflow-y: auto;
}
.list td {
  padding: 6px 16px;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}
.keys {
  white-space: nowrap;
  width: 1%;
}
kbd {
  font: inherit;
  font-size: 0.85em;
  background: var(--bg-soft);
  border: 1px solid var(--border);
  padding: 1px 6px;
  margin: 0 1px;
  color: var(--fg);
}
.plus {
  color: var(--fg-muted);
  margin: 0 2px;
}
.label { color: var(--fg); }
</style>
