import db from './index.js';

const insertStmt = db.prepare(`
  INSERT INTO messages (network_id, target, time, type, nick, text, kind, self, mention)
  VALUES (@networkId, @target, @time, @type, @nick, @text, @kind, @self, @mention)
`);

export function insertMessage(row) {
  const result = insertStmt.run({
    networkId: row.networkId,
    target: row.target,
    time: row.time,
    type: row.type,
    nick: row.nick ?? null,
    text: row.text ?? null,
    kind: row.kind ?? null,
    self: row.self ? 1 : 0,
    mention: row.mention ? 1 : 0,
  });
  return result.lastInsertRowid;
}

function rowToEvent(row) {
  return {
    id: row.id,
    networkId: row.network_id,
    target: row.target,
    time: row.time,
    type: row.type,
    nick: row.nick,
    text: row.text,
    kind: row.kind,
    self: !!row.self,
    mention: !!row.mention,
  };
}

export function listMessages(networkId, target, { before, limit = 50 } = {}) {
  const sql = before
    ? `SELECT * FROM messages WHERE network_id = ? AND target = ? AND id < ? ORDER BY id DESC LIMIT ?`
    : `SELECT * FROM messages WHERE network_id = ? AND target = ? ORDER BY id DESC LIMIT ?`;
  const params = before ? [networkId, target, before, limit] : [networkId, target, limit];
  const rows = db.prepare(sql).all(...params);
  return rows.map(rowToEvent).reverse();
}

export function listRecentForBuffers(networkId, targets, perBuffer = 50) {
  const out = {};
  for (const t of targets) {
    out[t] = listMessages(networkId, t, { limit: perBuffer });
  }
  return out;
}

export function listMentionsForUser(userId, { before, limit = 50 } = {}) {
  const sql = before
    ? `SELECT m.* FROM messages m
       JOIN networks n ON n.id = m.network_id
       WHERE n.user_id = ? AND m.mention = 1 AND m.id < ?
       ORDER BY m.id DESC LIMIT ?`
    : `SELECT m.* FROM messages m
       JOIN networks n ON n.id = m.network_id
       WHERE n.user_id = ? AND m.mention = 1
       ORDER BY m.id DESC LIMIT ?`;
  const params = before ? [userId, before, limit] : [userId, limit];
  return db.prepare(sql).all(...params).map(rowToEvent);
}

export function countOlder(networkId, target, beforeId) {
  return db.prepare(
    `SELECT COUNT(*) AS n FROM messages WHERE network_id = ? AND target = ? AND id < ?`
  ).get(networkId, target, beforeId).n;
}
