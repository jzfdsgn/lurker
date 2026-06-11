// Copyright (c) 2026 Brad Root
// SPDX-License-Identifier: MPL-2.0

import { defineStore } from 'pinia';
import { socketSend } from '../composables/useSocket.js';

// Per-channel overrides. Two independent flags are tracked:
//   notifyAlways — every message in the channel is a notification trigger for
//                  push/toast (without lighting the channel up as a highlight).
//   muted        — buffer-list display only: suppress the plain-unread signal
//                  (count + row color + off-screen unread arrow); highlights
//                  and notifications are untouched.
// The server is the source of truth — toggles send a WS message, and the
// `channel-notify-changed` echo (carrying both flags) updates state on all the
// user's tabs.

export interface ChannelNotifyFlags {
  notifyAlways: boolean;
  muted: boolean;
}

export interface ChannelNotifyEntry {
  networkId: number;
  target: string;
}

export const useChannelNotifyStore = defineStore('channelNotify', {
  state: () => ({
    // { [networkId]: { [target]: { notifyAlways, muted } } } — only channels
    // with any flag set live here; absent entries default to all-off.
    byNetwork: {} as Record<number | string, Record<string, ChannelNotifyFlags>>,
  }),
  getters: {
    notifyAlways: (state) => (networkId: number | string, target: string) =>
      !!state.byNetwork[networkId]?.[target]?.notifyAlways,
    muted: (state) => (networkId: number | string, target: string) =>
      !!state.byNetwork[networkId]?.[target]?.muted,
    // List of { networkId, target } for all channels that currently have
    // always-notify enabled — used by the Settings panel's "always-notify
    // channels" audit list.
    alwaysNotifyChannels: (state): ChannelNotifyEntry[] => {
      const out: ChannelNotifyEntry[] = [];
      for (const [networkId, byTarget] of Object.entries(state.byNetwork)) {
        for (const [target, flags] of Object.entries(byTarget || {})) {
          if (flags?.notifyAlways) out.push({ networkId: Number(networkId), target });
        }
      }
      return out;
    },
  },
  actions: {
    applySnapshot(networks: any[]) {
      const next: Record<number | string, Record<string, ChannelNotifyFlags>> = {};
      for (const n of networks || []) {
        if (n?.networkId != null) next[n.networkId] = { ...n.channelNotify };
      }
      this.byNetwork = next;
    },
    applyChange(networkId: number | string, target: string, flags: ChannelNotifyFlags) {
      if (!this.byNetwork[networkId]) this.byNetwork[networkId] = {};
      if (flags.notifyAlways || flags.muted) {
        this.byNetwork[networkId][target] = {
          notifyAlways: !!flags.notifyAlways,
          muted: !!flags.muted,
        };
      } else {
        // Both flags off — drop the entry so it mirrors the server's row delete.
        delete this.byNetwork[networkId][target];
      }
    },
    setNotifyAlways(networkId: number | string, target: string, notifyAlways: boolean) {
      socketSend({ type: 'set-channel-notify-always', networkId, target, notifyAlways });
    },
    setMuted(networkId: number | string, target: string, muted: boolean) {
      socketSend({ type: 'set-channel-muted', networkId, target, muted });
    },
  },
});
