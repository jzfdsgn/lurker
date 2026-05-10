import { defineStore } from 'pinia';

function key(networkId, target) {
  return `${networkId}::${target}`;
}

// Per-buffer history of every line submitted through the input bar (chat,
// /commands, /raw, even client-only lines like /help). Server is the source of
// truth; this store mirrors the most-recent slice the server ships on snapshot
// plus optimistic local appends on submit. MessageInput drives up/down recall
// off `forBuffer`.
export const useInputHistoryStore = defineStore('inputHistory', {
  state: () => ({
    history: {},
  }),
  getters: {
    forBuffer: (state) => (networkId, target) => state.history[key(networkId, target)] || [],
  },
  actions: {
    seed(networkId, target, entries) {
      if (!Array.isArray(entries)) return;
      this.history[key(networkId, target)] = entries.slice();
    },
    add(networkId, target, text) {
      if (!text) return;
      const k = key(networkId, target);
      const arr = this.history[k] || [];
      this.history[k] = [...arr, text];
    },
    drop(networkId, target) {
      delete this.history[key(networkId, target)];
    },
  },
});
