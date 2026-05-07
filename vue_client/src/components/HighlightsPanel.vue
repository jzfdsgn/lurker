<template>
  <div class="modal" @click.self="$emit('close')">
    <div class="card">
      <header>
        <h2>Highlights</h2>
        <button class="link" @click="$emit('close')">close</button>
      </header>
      <div v-if="loading && !events.length" class="empty">loading…</div>
      <p v-else-if="!events.length" class="empty">No mentions yet.</p>
      <ul v-else class="list">
        <li v-for="ev in events" :key="ev.id" @click="jump(ev)">
          <div class="meta">
            <span class="when">{{ time(ev.time) }}</span>
            <span class="where">{{ networkName(ev.networkId) }} · {{ ev.target }}</span>
          </div>
          <div class="line">
            <span class="nick">&lt;{{ ev.nick }}&gt;</span>
            <span class="text">{{ ev.text }}</span>
          </div>
        </li>
      </ul>
      <button v-if="hasMore" class="more" :disabled="loading" @click="loadMore">
        {{ loading ? 'loading…' : 'load older' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useNetworksStore } from '../stores/networks.js';
import { useBuffersStore } from '../stores/buffers.js';
import { api } from '../api.js';

const emit = defineEmits(['close']);
const networks = useNetworksStore();
const buffers = useBuffersStore();

const events = ref([]);
const hasMore = ref(false);
const loading = ref(false);

async function load(before) {
  loading.value = true;
  try {
    const params = new URLSearchParams({ limit: '50' });
    if (before) params.set('before', before);
    const res = await api(`/api/highlights?${params}`);
    if (before) events.value.push(...res.events);
    else events.value = res.events;
    hasMore.value = !!res.hasMore;
  } finally {
    loading.value = false;
  }
}

async function loadMore() {
  const last = events.value[events.value.length - 1];
  if (last) await load(last.id);
}

function networkName(id) {
  return networks.networks.find((n) => n.id === id)?.name || `network ${id}`;
}

function time(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function jump(ev) {
  buffers.ensure(ev.networkId, ev.target);
  networks.setActive(ev.networkId, ev.target);
  buffers.markRead(ev.networkId, ev.target);
  emit('close');
}

onMounted(() => load());
</script>

<style scoped>
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.card {
  background: var(--bg-alt);
  border: 1px solid var(--border);
  border-radius: 8px;
  width: 560px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}
header {
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
h2 { margin: 0; color: var(--accent); font-size: 16px; }
.link {
  background: none;
  border: none;
  color: var(--accent);
  cursor: pointer;
  font: inherit;
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow: auto;
  flex: 1;
}
.list li {
  padding: 10px 18px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
}
.list li:hover { background: var(--bg-soft); }
.meta {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--fg-muted);
  margin-bottom: 4px;
}
.line { font-family: var(--mono); font-size: 13px; }
.nick { color: var(--accent); margin-right: 6px; }
.text { white-space: pre-wrap; word-break: break-word; }
.empty { padding: 24px; text-align: center; color: var(--fg-muted); }
.more {
  margin: 12px;
  padding: 6px;
}
</style>
