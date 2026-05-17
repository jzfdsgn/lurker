// Copyright (c) 2026 Brad Root
// SPDX-License-Identifier: Elastic-2.0

import db from './index.js';

// Ownership-gated insert. The SELECT inside the INSERT confirms the message
// belongs to one of the caller's networks; if it doesn't, the SELECT returns
// no rows and the insert is a silent no-op. Cheaper than a separate lookup
// round-trip and atomic with the write.
const insertStmt = db.prepare(`
  INSERT INTO user_bookmarks (user_id, message_id, created_at)
  SELECT @userId, @messageId, datetime('now')
  WHERE EXISTS (
    SELECT 1 FROM messages m
    JOIN networks n ON n.id = m.network_id
    WHERE m.id = @messageId AND n.user_id = @userId
  )
  ON CONFLICT(user_id, message_id) DO NOTHING
`);

const deleteStmt = db.prepare(`
  DELETE FROM user_bookmarks WHERE user_id = ? AND message_id = ?
`);

const existsStmt = db.prepare(`
  SELECT 1 FROM user_bookmarks WHERE user_id = ? AND message_id = ?
`);

const listIdsStmt = db.prepare(`
  SELECT message_id AS messageId FROM user_bookmarks
  WHERE user_id = ?
  ORDER BY message_id DESC
`);

export function addBookmark(userId, messageId) {
  insertStmt.run({ userId, messageId });
  return !!existsStmt.get(userId, messageId);
}

export function removeBookmark(userId, messageId) {
  deleteStmt.run(userId, messageId);
}

export function isBookmarked(userId, messageId) {
  return !!existsStmt.get(userId, messageId);
}

export function listBookmarkIdsForUser(userId) {
  return listIdsStmt.all(userId).map((r) => r.messageId);
}

// Paginated list joined with messages + networks. Row shape matches
// listUserHighlights so the same HistoryMessageRow component can render
// bookmark items unchanged.
export function listBookmarksForUser(userId, { before, limit = 50 } = {}) {
  const sql = before
    ? `SELECT m.*, n.name AS network_name
       FROM user_bookmarks b
       JOIN messages m ON m.id = b.message_id
       JOIN networks n ON n.id = m.network_id
       WHERE b.user_id = ?
         AND m.id < ?
       ORDER BY m.id DESC
       LIMIT ?`
    : `SELECT m.*, n.name AS network_name
       FROM user_bookmarks b
       JOIN messages m ON m.id = b.message_id
       JOIN networks n ON n.id = m.network_id
       WHERE b.user_id = ?
       ORDER BY m.id DESC
       LIMIT ?`;
  const params = before ? [userId, before, limit] : [userId, limit];
  const rows = db.prepare(sql).all(...params);
  return rows.map((row) => {
    const event = {
      id: row.id,
      networkId: row.network_id,
      target: row.target,
      time: row.time,
      type: row.type,
      nick: row.nick,
      text: row.text,
      kind: row.kind,
      self: !!row.self,
      userhost: row.userhost ?? null,
      alt: row.alt === 1,
      matched: row.matched_rule_id != null,
      matchedRuleId: row.matched_rule_id,
      networkName: row.network_name,
    };
    if (row.extra) {
      try {
        Object.assign(event, JSON.parse(row.extra));
      } catch (_) { /* ignore */ }
    }
    return event;
  });
}
