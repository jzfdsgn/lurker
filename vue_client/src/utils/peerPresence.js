// Copyright (c) 2026 Brad Root
// SPDX-License-Identifier: Elastic-2.0

// Derive UX state from a peer presence row. The row carries only the most
// recent transition ({ state, stateAt }); these helpers translate that to
// the boolean states BufferList / StatusBar care about.

export function isPeerOffline(peer) {
  return peer?.state === 'offline';
}

export function isPeerAway(peer) {
  return peer?.state === 'away';
}

// "Online" in the UX sense covers 'online' and 'back' — the peer is
// reachable and not flagged AFK. Unknown peers (null) aren't called online.
export function isPeerOnline(peer) {
  return peer?.state === 'online' || peer?.state === 'back';
}
