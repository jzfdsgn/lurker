<!--
  Copyright (c) 2026 Brad Root
  SPDX-License-Identifier: Elastic-2.0
-->

<template>
  <div class="modal" @click.self="$emit('cancel')">
    <div class="card">
      <header class="head">
        <h2>message will flood {{ chunks }} lines</h2>
        <button type="button" class="link" @click="$emit('cancel')" title="cancel"><i class="fa-solid fa-xmark"></i></button>
      </header>
      <p class="desc">
        IRC will split this into {{ chunks }} separate lines. Upload it as a <code>.txt</code> file instead?
      </p>
      <pre class="preview">{{ content }}</pre>
      <footer class="foot">
        <button type="button" class="btn secondary" @click="$emit('cancel')">Cancel</button>
        <button
          ref="primaryBtn"
          type="button"
          class="btn primary"
          :disabled="uploading"
          @click="$emit('confirm')"
        >{{ uploading ? 'Uploading…' : 'Upload as .txt' }}</button>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

defineProps({
  content: { type: String, required: true },
  chunks: { type: Number, required: true },
  uploading: { type: Boolean, default: false },
});

defineEmits(['confirm', 'cancel']);

const primaryBtn = ref(null);

onMounted(() => {
  // Focus the primary action so Enter confirms, matching the user's intent
  // (they already hit Send once to get here).
  primaryBtn.value?.focus();
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
  width: min(640px, 90vw);
  max-height: 80vh;
  display: flex;
  flex-direction: column;
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
.desc {
  margin: 0;
  padding: 12px 16px;
  color: var(--fg-muted);
}
.desc code {
  background: var(--bg-soft);
  padding: 1px 4px;
  border-radius: 2px;
}
.preview {
  margin: 0 16px 12px;
  padding: 8px 12px;
  background: var(--bg-soft);
  border: 1px solid var(--border);
  overflow: auto;
  flex: 1;
  min-height: 0;
  max-height: 40vh;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 0.95em;
  color: var(--fg);
}
.foot {
  border-top: 1px solid var(--border);
  padding: 12px 16px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.btn {
  background: var(--bg-soft);
  border: 1px solid var(--border);
  color: var(--fg);
  cursor: pointer;
  font: inherit;
  padding: 6px 14px;
}
.btn:hover:not(:disabled) { border-color: var(--accent); }
.btn:disabled { opacity: 0.5; cursor: default; }
.btn.primary {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--bg);
}
.btn.primary:hover:not(:disabled) {
  filter: brightness(1.1);
}
</style>
