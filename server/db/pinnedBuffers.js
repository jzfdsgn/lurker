// Copyright (c) 2026 Brad Root
// SPDX-License-Identifier: Elastic-2.0

import db from './index.js';

const listForUserNetworkStmt = db.prepare(`
  SELECT target FROM pinned_buffers
  WHERE user_id = ? AND network_id = ?
  ORDER BY position ASC, target ASC
`);

const listForUserStmt = db.prepare(`
  SELECT network_id AS networkId, target FROM pinned_buffers
  WHERE user_id = ?
  ORDER BY network_id ASC, position ASC, target ASC
`);

const nextPositionStmt = db.prepare(`
  SELECT COALESCE(MAX(position), -1) + 1 AS next
  FROM pinned_buffers
  WHERE user_id = ? AND network_id = ?
`);

const insertStmt = db.prepare(`
  INSERT OR IGNORE INTO pinned_buffers (user_id, network_id, target, position)
  VALUES (?, ?, ?, ?)
`);

const deleteStmt = db.prepare(`
  DELETE FROM pinned_buffers
  WHERE user_id = ? AND network_id = ? AND target = ?
`);

const allForUserNetworkStmt = db.prepare(`
  SELECT target, position FROM pinned_buffers
  WHERE user_id = ? AND network_id = ?
  ORDER BY position ASC
`);

const setPositionStmt = db.prepare(`
  UPDATE pinned_buffers SET position = ?
  WHERE user_id = ? AND network_id = ? AND target = ?
`);

export function listPinnedForUserNetwork(userId, networkId) {
  return listForUserNetworkStmt.all(userId, networkId).map((r) => r.target);
}

export function listPinnedForUser(userId) {
  const byNetwork = new Map();
  for (const row of listForUserStmt.all(userId)) {
    if (!byNetwork.has(row.networkId)) byNetwork.set(row.networkId, []);
    byNetwork.get(row.networkId).push(row.target);
  }
  return byNetwork;
}

// Returns the new ordered target list for the (user, network). No-op if the
// row already exists (idempotent — second pin of the same target keeps the
// existing position rather than creating a duplicate or moving it).
export function pinBuffer(userId, networkId, target) {
  const tx = db.transaction(() => {
    const { next } = nextPositionStmt.get(userId, networkId);
    insertStmt.run(userId, networkId, target, next);
  });
  tx();
  return listPinnedForUserNetwork(userId, networkId);
}

// Unpin and renumber remaining rows to keep positions dense (0..n-1). Returns
// the new ordered target list.
export function unpinBuffer(userId, networkId, target) {
  const tx = db.transaction(() => {
    deleteStmt.run(userId, networkId, target);
    const remaining = allForUserNetworkStmt.all(userId, networkId);
    let i = 0;
    for (const row of remaining) {
      if (row.position !== i) {
        setPositionStmt.run(i, userId, networkId, row.target);
      }
      i += 1;
    }
  });
  tx();
  return listPinnedForUserNetwork(userId, networkId);
}

// Rewrite the order for a (user, network). The caller must supply exactly the
// set of currently-pinned targets (no adds, no drops); the function validates
// and returns null on mismatch so the caller can surface a no-op. On success
// returns the new ordered target list.
export function reorderPins(userId, networkId, targets) {
  const current = new Set(listPinnedForUserNetwork(userId, networkId));
  if (targets.length !== current.size) return null;
  for (const t of targets) {
    if (!current.has(t)) return null;
  }
  const tx = db.transaction(() => {
    let i = 0;
    for (const t of targets) {
      setPositionStmt.run(i, userId, networkId, t);
      i += 1;
    }
  });
  tx();
  return [...targets];
}
