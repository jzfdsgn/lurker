// Copyright (c) 2026 Brad Root
// SPDX-License-Identifier: Elastic-2.0

import db from './index.js';

// Per-(user, network, channel) override for the desktop nicklist collapsed
// state. Only explicitly-toggled channels have a row; everything else falls
// back to the global look.layout.show_member_list default on the client.

const listForUserStmt = db.prepare(`
  SELECT network_id AS networkId, target, collapsed FROM nicklist_collapsed
  WHERE user_id = ?
`);

const listForUserNetworkStmt = db.prepare(`
  SELECT target, collapsed FROM nicklist_collapsed
  WHERE user_id = ? AND network_id = ?
`);

const upsertStmt = db.prepare(`
  INSERT INTO nicklist_collapsed (user_id, network_id, target, collapsed)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(user_id, network_id, target)
  DO UPDATE SET collapsed = excluded.collapsed
`);

// Map<networkId, { [target]: boolean }> for the whole user, used to seed the
// snapshot the client gets on connect.
export function listCollapsedForUser(userId) {
  const byNetwork = new Map();
  for (const row of listForUserStmt.all(userId)) {
    if (!byNetwork.has(row.networkId)) byNetwork.set(row.networkId, {});
    byNetwork.get(row.networkId)[row.target] = !!row.collapsed;
  }
  return byNetwork;
}

// Plain { [target]: boolean } object for a single (user, network).
export function listCollapsedForUserNetwork(userId, networkId) {
  const out = {};
  for (const row of listForUserNetworkStmt.all(userId, networkId)) {
    out[row.target] = !!row.collapsed;
  }
  return out;
}

export function setNicklistCollapsed(userId, networkId, target, collapsed) {
  upsertStmt.run(userId, networkId, target, collapsed ? 1 : 0);
}
