// Copyright (c) 2026 Brad Root
// SPDX-License-Identifier: MPL-2.0

// Sidebar order across all networks. Mirrors the visual layout in BufferList:
// per network, the server pseudo-buffer first, then pinned buffers in their
// stored order, then unpinned buffers (channels alphabetically before DMs
// alphabetically). Used by keyboard navigation so prev/next-channel and the
// quick switcher walk the same order the user sees in the sidebar.

function isServerTarget(target) {
  return typeof target === 'string' && target.startsWith(':server:');
}

function isChannelTarget(target) {
  return typeof target === 'string' && target.startsWith('#');
}

function sortKey(target) {
  return target.replace(/^#+/, '').toLowerCase();
}

function bufferOrder(target) {
  return isChannelTarget(target) ? 0 : 1;
}

// Returns a flat array of { networkId, target } entries in sidebar order.
export function flattenBufferOrder({ networks, buffers, pins }) {
  const out = [];
  for (const net of networks) {
    const serverTarget = `:server:${net.id}`;
    out.push({ networkId: net.id, target: serverTarget });

    const pinnedTargets = pins.forNetwork(net.id) || [];
    const pinnedSet = new Set(pinnedTargets);
    const all = buffers.forNetwork(net.id);
    const byTarget = new Map();
    for (const b of all) byTarget.set(b.target, b);

    for (const t of pinnedTargets) {
      if (byTarget.has(t)) out.push({ networkId: net.id, target: t });
    }

    const unpinned = all
      .filter((b) => !isServerTarget(b.target) && !pinnedSet.has(b.target))
      .sort((a, b) => {
        const oa = bufferOrder(a.target);
        const ob = bufferOrder(b.target);
        if (oa !== ob) return oa - ob;
        return sortKey(a.target).localeCompare(sortKey(b.target));
      });
    for (const b of unpinned) out.push({ networkId: net.id, target: b.target });
  }
  return out;
}

// Same shape as flattenBufferOrder but only entries with unread > 0. Server
// pseudo-buffers participate (network-level notices land there).
export function flattenUnreadOrder({ networks, buffers, pins }) {
  return flattenBufferOrder({ networks, buffers, pins }).filter((entry) => {
    const buf = buffers.byKey(`${entry.networkId}::${entry.target}`);
    return !!buf && buf.unread > 0;
  });
}
