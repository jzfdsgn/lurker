// Copyright (c) 2026 Brad Root
// SPDX-License-Identifier: Elastic-2.0

import { reactive } from 'vue';

// Single global context menu, controlled imperatively by any consumer.
// State is module-level so every useContextMenu() caller shares the same
// instance and there's exactly one popup on screen at a time. Mount one
// <ContextMenu /> at the app root (App.vue) — it reads from this state.
//
// Items shape:
//   { label, onClick, icon?, disabled?, divider? }
// `icon` is a Font Awesome class string (e.g. 'fa-solid fa-thumbtack'); the
// menu renders it as `<i class="…">`. A `divider: true` item is rendered as a
// separator line; other fields ignored.

const state = reactive({
  open: false,
  x: 0,
  y: 0,
  items: [],
});

export function useContextMenu() {
  return {
    state,
    open(items, x, y) {
      if (!Array.isArray(items) || items.length === 0) return;
      state.items = items;
      state.x = x;
      state.y = y;
      state.open = true;
    },
    close() {
      state.open = false;
      state.items = [];
    },
  };
}
