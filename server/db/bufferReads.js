import db from './index.js';

const upsertStmt = db.prepare(`
  INSERT INTO buffer_reads (user_id, network_id, target, last_read_message_id, updated_at)
  VALUES (?, ?, ?, ?, datetime('now'))
  ON CONFLICT(user_id, network_id, target) DO UPDATE SET
    last_read_message_id = MAX(last_read_message_id, excluded.last_read_message_id),
    updated_at = excluded.updated_at
`);

const getOneStmt = db.prepare(`
  SELECT last_read_message_id AS lastReadId
  FROM buffer_reads
  WHERE user_id = ? AND network_id = ? AND target = ?
`);

const listForUserStmt = db.prepare(`
  SELECT network_id AS networkId, target, last_read_message_id AS lastReadId
  FROM buffer_reads
  WHERE user_id = ?
`);

// Returns map keyed by `${networkId}::${target}` → lastReadId.
export function listReadStateForUser(userId) {
  const out = {};
  for (const row of listForUserStmt.all(userId)) {
    out[`${row.networkId}::${row.target}`] = row.lastReadId;
  }
  return out;
}

export function getReadState(userId, networkId, target) {
  const row = getOneStmt.get(userId, networkId, target);
  return row ? row.lastReadId : 0;
}

// Clamps to MAX(existing, requested) via the ON CONFLICT clause. Returns the
// resulting lastReadId so the caller can broadcast a value the server agrees
// with rather than echoing what the client sent.
export function setReadState(userId, networkId, target, messageId) {
  const id = Number(messageId);
  if (!Number.isFinite(id) || id <= 0) return getReadState(userId, networkId, target);
  upsertStmt.run(userId, networkId, target, id);
  return getReadState(userId, networkId, target);
}
