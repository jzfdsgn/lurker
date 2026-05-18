// Copyright (c) 2026 Brad Root
// SPDX-License-Identifier: MPL-2.0

import db from './index.js';

const insertStmt = db.prepare(`
  INSERT INTO input_history (user_id, network_id, target, text)
  VALUES (?, ?, ?, ?)
`);

const listRecentStmt = db.prepare(`
  SELECT text FROM input_history
  WHERE user_id = ? AND network_id = ? AND target = ?
  ORDER BY id DESC
  LIMIT ?
`);

export function addEntry(userId, networkId, target, text) {
  insertStmt.run(userId, networkId, target, text);
}

// Returns the `limit` most recent entries, oldest-first — the order the client
// wants for up-arrow walking (index N-1 is newest, walk backwards toward 0).
// The table itself is uncapped; this slice is just what we ship on snapshot.
export function listRecent(userId, networkId, target, limit = 200) {
  return listRecentStmt
    .all(userId, networkId, target, limit)
    .map((row) => row.text)
    .reverse();
}
