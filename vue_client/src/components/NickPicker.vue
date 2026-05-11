<template>
  <div
    v-if="open && rows.length"
    ref="panelEl"
    class="nick-picker"
    :style="panelStyle"
    @pointerdown.stop
  >
    <div
      v-for="row in rows"
      :key="row.lc"
      class="row"
      :class="{ recent: row.recent }"
      @pointerdown.prevent="pick(row.nick)"
    >
      <span class="nick">{{ row.nick }}</span>
      <span v-if="row.recent" class="badge">recent</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';

const props = defineProps({
  open: { type: Boolean, default: false },
  query: { type: String, default: '' },
  buffer: { type: Object, default: null },
  selfNick: { type: String, default: '' },
  anchor: { type: HTMLElement, default: null },
});

const emit = defineEmits(['select', 'close']);

const panelEl = ref(null);
const panelBottom = ref(8);

const rows = computed(() => {
  const buf = props.buffer;
  if (!buf) return [];
  const lower = (props.query || '').toLowerCase();
  const seen = new Set();
  // Pre-seed with our own nick so the speakers map (defense against pre-fix
  // stale state) and the members list (which always contains us) skip it.
  if (props.selfNick) seen.add(props.selfNick.toLowerCase());
  const out = [];

  const speakers = Object.values(buf.speakers || {})
    .sort((a, b) => b.lastTime - a.lastTime);
  for (const s of speakers) {
    const lc = s.nick.toLowerCase();
    if (seen.has(lc)) continue;
    if (!lc.startsWith(lower)) continue;
    seen.add(lc);
    out.push({ nick: s.nick, lc, recent: true });
  }

  const memberNames = (buf.members || [])
    .map((m) => (typeof m === 'string' ? m : m.nick))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
  for (const n of memberNames) {
    const lc = n.toLowerCase();
    if (seen.has(lc)) continue;
    if (!lc.startsWith(lower)) continue;
    seen.add(lc);
    out.push({ nick: n, lc, recent: false });
  }

  return out.slice(0, 50);
});

function pick(nick) {
  emit('select', nick);
}

function recomputePosition() {
  // Anchor the picker just above the input bar, riding above the iOS soft
  // keyboard via visualViewport.height. Without this, the picker gets
  // occluded as soon as the keyboard slides up.
  const anchor = props.anchor;
  if (!anchor) {
    panelBottom.value = 8;
    return;
  }
  const rect = anchor.getBoundingClientRect();
  const vv = window.visualViewport;
  const viewportHeight = vv ? vv.height : window.innerHeight;
  // Distance from bottom of viewport to top of anchor.
  const distance = viewportHeight - rect.top;
  panelBottom.value = Math.max(distance + 4, 8);
}

const panelStyle = computed(() => ({ bottom: `${panelBottom.value}px` }));

function onDocPointerDown(e) {
  if (!props.open) return;
  const panel = panelEl.value;
  const anchor = props.anchor;
  if (panel && panel.contains(e.target)) return;
  if (anchor && anchor.contains(e.target)) return;
  emit('close');
}

function onKey(e) {
  if (!props.open) return;
  if (e.key === 'Escape') emit('close');
}

onMounted(() => {
  recomputePosition();
  window.addEventListener('resize', recomputePosition);
  window.visualViewport?.addEventListener('resize', recomputePosition);
  window.visualViewport?.addEventListener('scroll', recomputePosition);
  document.addEventListener('pointerdown', onDocPointerDown);
  document.addEventListener('keydown', onKey);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', recomputePosition);
  window.visualViewport?.removeEventListener('resize', recomputePosition);
  window.visualViewport?.removeEventListener('scroll', recomputePosition);
  document.removeEventListener('pointerdown', onDocPointerDown);
  document.removeEventListener('keydown', onKey);
});

watch(() => props.open, (v) => { if (v) recomputePosition(); });
</script>

<style scoped>
.nick-picker {
  position: fixed;
  left: 8px;
  right: 8px;
  max-width: 480px;
  margin: 0 auto;
  max-height: 50vh;
  overflow-y: auto;
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.4);
  z-index: 1000;
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  min-height: 44px;
  cursor: pointer;
  border-bottom: 1px solid var(--border);
  user-select: none;
}
.row:last-child { border-bottom: none; }
.row:hover { background: var(--bg); }
.row.recent .nick { color: var(--accent); }
.nick { font-weight: 500; }
.badge {
  font-size: 0.85em;
  color: var(--fg-muted);
  font-style: italic;
}
</style>
