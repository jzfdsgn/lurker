// Copyright (c) 2026 Brad Root
// SPDX-License-Identifier: MPL-2.0

import { defineStore } from 'pinia';
import { socketSend } from '../composables/useSocket.js';

// Per-channel override for the desktop nicklist collapsed state. The server is
// the source of truth: a toggle sends a WS message and the `nicklist-collapsed
// -changed` echo updates state. Channels with no entry here fall back to the
// global look.layout.show_member_list default — see DesktopChat's showMembers.
export const useNicklistCollapseStore = defineStore('nicklistCollapse', {
  state: () => ({
    // { [networkId]: { [target]: boolean } } — true means collapsed (hidden).
    byNetwork: {},
  }),
  getters: {
    // Returns the explicit override boolean, or undefined when the channel has
    // never been toggled (caller falls back to the global default).
    override: (state) => (networkId, target) => state.byNetwork[networkId]?.[target],
  },
  actions: {
    setNetwork(networkId, map) {
      this.byNetwork[networkId] = { ...(map || {}) };
    },
    applySnapshot(networks) {
      const next = {};
      for (const n of networks || []) {
        if (n?.networkId != null) next[n.networkId] = { ...(n.collapsedNicklists || {}) };
      }
      this.byNetwork = next;
    },
    applyChange(networkId, target, collapsed) {
      if (!this.byNetwork[networkId]) this.byNetwork[networkId] = {};
      this.byNetwork[networkId][target] = collapsed;
    },
    setCollapsed(networkId, target, collapsed) {
      socketSend({ type: 'set-nicklist-collapsed', networkId, target, collapsed });
    },
  },
});
