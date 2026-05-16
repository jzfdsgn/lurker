<!--
  Copyright (c) 2026 Brad Root
  SPDX-License-Identifier: Elastic-2.0
-->

<template>
  <AppModal word="highlights" title="highlights" size="lg" @close="$emit('close')">
    <template #actions>
      <button
        class="link sound-toggle"
        :title="soundEnabled ? 'mute highlight sound' : 'unmute highlight sound'"
        @click="toggleSound"
      >
        <i :class="soundEnabled ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark'"></i>
      </button>
    </template>

    <p v-if="store.error" class="error inline">{{ store.error }}</p>
    <ul v-if="visibleItems.length" class="match-list">
      <li
        v-for="m in visibleItems"
        :key="`${m.networkId}::${m.target}::${m.id}`"
        class="match"
        @click="onJump(m)"
      >
        <span class="time">{{ time(m.time) }}</span>
        <span class="loc">
          <span class="net">{{ m.networkName || networkName(m.networkId) }}</span>
          <span class="target">{{ targetLabel(m) }}</span>
        </span>
        <span class="nick" :style="nickStyle(m)">{{ m.nick }}</span>
        <span class="text">{{ m.text }}</span>
      </li>
    </ul>
    <p v-else-if="store.loading" class="empty">Loading…</p>
    <p v-else-if="store.items.length" class="empty">All highlights are from ignored users.</p>
    <p v-else class="empty">No highlights yet.</p>
    <footer v-if="store.hasMore || store.loading" class="foot">
      <button
        class="link"
        :disabled="store.loading || !store.hasMore"
        @click="store.loadMore()"
      >{{ store.loading ? 'Loading…' : 'Load more' }}</button>
    </footer>
  </AppModal>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import AppModal from './AppModal.vue';
import { useNetworksStore } from '../stores/networks.js';
import { useSettingsStore } from '../stores/settings.js';
import { useHighlightsStore } from '../stores/highlights.js';
import { useIgnoresStore } from '../stores/ignores.js';
import { useNickColors } from '../composables/useNickColors.js';
import { formatTimestamp } from '../utils/timestamp.js';

const emit = defineEmits(['close', 'jump']);

const networks = useNetworksStore();
const settings = useSettingsStore();
const store = useHighlightsStore();
const ignores = useIgnoresStore();
const nicks = useNickColors();

const visibleItems = computed(() =>
  store.items.filter((m) => !ignores.isIgnored(m.networkId, m.nick, m.userhost))
);

const tsFormat = computed(() => settings.effective('look.buffer.time_format'));
const soundEnabled = computed(() => !!settings.effective('notifications.highlight.sound.enabled'));

async function toggleSound() {
  try {
    await settings.setValue('notifications.highlight.sound.enabled', !soundEnabled.value);
  } catch (_) { /* setting writes are best-effort from the modal */ }
}

onMounted(() => {
  store.loadInitial();
});

function time(iso) {
  return formatTimestamp(iso, tsFormat.value);
}

function networkName(id) {
  return networks.networks.find((n) => n.id === id)?.name || `net:${id}`;
}

function targetLabel(m) {
  if (m.target && m.target.startsWith(':server:')) return '[server]';
  return m.target;
}

function nickStyle(m) {
  const c = nicks.color(m.nick);
  return c ? { color: c } : null;
}

function onJump(m) {
  emit('jump', { networkId: m.networkId, target: m.target, messageId: m.id });
  emit('close');
}
</script>

<style scoped>
.link {
  background: none;
  border: none;
  color: var(--fg-muted);
  cursor: pointer;
  font: inherit;
  padding: 0 4px;
}
.link:hover { color: var(--accent); }
.link:disabled { opacity: 0.5; cursor: default; }
.sound-toggle { font-size: 1.1em; }

.match-list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}
.match {
  display: grid;
  grid-template-columns: max-content max-content max-content 1fr;
  gap: 8px;
  align-items: baseline;
  padding: 6px 8px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
}
.match:hover { background: var(--bg-soft); }

.time { color: var(--fg-muted); }
.loc { color: var(--fg-muted); display: flex; gap: 4px; }
.loc .net { color: var(--accent); }
.nick { font-weight: 600; }
.text {
  white-space: pre-wrap;
  word-break: break-word;
}
.empty {
  text-align: center;
  color: var(--fg-muted);
  font-style: italic;
  padding: 32px;
}
.error.inline {
  color: var(--bad);
  padding: 8px 0;
  margin: 0;
}
.foot {
  border-top: 1px solid var(--border);
  padding: 8px 0;
  display: flex;
  justify-content: center;
}
</style>
