import { defineStore } from 'pinia';
import { socketSend } from '../composables/useSocket.js';

// Pinned buffers per network, in user-controlled order. The server is the
// source of truth: mutations send a WS message and wait for the `pins-changed`
// echo to update state. Drag UX still feels instant because vuedraggable
// updates its own local order during the drag; this store catches up on drop.
export const usePinsStore = defineStore('pins', {
  state: () => ({
    byNetwork: {},
  }),
  getters: {
    forNetwork: (state) => (networkId) => state.byNetwork[networkId] || [],
    isPinned: (state) => (networkId, target) =>
      (state.byNetwork[networkId] || []).includes(target),
  },
  actions: {
    setNetwork(networkId, pinned) {
      this.byNetwork[networkId] = Array.isArray(pinned) ? [...pinned] : [];
    },
    applySnapshot(networks) {
      const next = {};
      for (const n of networks || []) {
        if (n?.networkId != null) next[n.networkId] = [...(n.pinned || [])];
      }
      this.byNetwork = next;
    },
    pin(networkId, target) {
      socketSend({ type: 'pin-buffer', networkId, target });
    },
    unpin(networkId, target) {
      socketSend({ type: 'unpin-buffer', networkId, target });
    },
    reorder(networkId, targets) {
      socketSend({ type: 'reorder-pins', networkId, targets });
    },
  },
});
