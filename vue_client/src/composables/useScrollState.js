// Copyright (c) 2026 Brad Root
// SPDX-License-Identifier: Elastic-2.0

import { ref } from 'vue';

// Bridges MessageList's scroll position into the StatusBar without a prop drill.
// MessageList writes via the setters; StatusBar reads the refs.
const stuckToBottom = ref(true);
const newBelow = ref(0);
const scrollToBottomToken = ref(0);

export function useScrollState() {
  return { stuckToBottom, newBelow, scrollToBottomToken };
}

export function setStuckToBottom(v) {
  stuckToBottom.value = !!v;
  if (v) newBelow.value = 0;
}

export function bumpNewBelow() {
  if (!stuckToBottom.value) newBelow.value += 1;
}

export function resetScrollState() {
  stuckToBottom.value = true;
  newBelow.value = 0;
}

export function requestScrollToBottom() {
  scrollToBottomToken.value += 1;
}
