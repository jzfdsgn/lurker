// Copyright (c) 2026 Brad Root
// SPDX-License-Identifier: MPL-2.0

import crypto from 'crypto';
import db from './index.js';

// 24 random bytes → 32-char base64url. Plenty of entropy for an invite link
// that's only valid until first use (or until manually revoked).
function generateToken() {
  return crypto.randomBytes(24).toString('base64url');
}

export function createInvite(createdBy, { expiresInDays = 7 } = {}) {
  const token = generateToken();
  const expiresAt = expiresInDays > 0
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;
  db.prepare(`
    INSERT INTO invite_tokens (token, created_by, expires_at)
    VALUES (?, ?, ?)
  `).run(token, createdBy, expiresAt);
  return getInvite(token);
}

export function getInvite(token) {
  if (!token) return null;
  return db.prepare(`
    SELECT token, created_by AS createdBy, expires_at AS expiresAt,
           used_by_user_id AS usedByUserId, used_at AS usedAt,
           created_at AS createdAt
    FROM invite_tokens WHERE token = ?
  `).get(token) || null;
}

export function listInvites() {
  return db.prepare(`
    SELECT i.token, i.created_by AS createdBy, i.expires_at AS expiresAt,
           i.used_by_user_id AS usedByUserId, i.used_at AS usedAt,
           i.created_at AS createdAt,
           c.username AS createdByUsername,
           u.username AS usedByUsername
    FROM invite_tokens i
    LEFT JOIN users c ON c.id = i.created_by
    LEFT JOIN users u ON u.id = i.used_by_user_id
    ORDER BY i.created_at DESC
  `).all();
}

export function deleteInvite(token) {
  const info = db.prepare('DELETE FROM invite_tokens WHERE token = ?').run(token);
  return info.changes > 0;
}

// Check status without mutating. Returns one of:
//   { status: 'unknown' } — no row for this token
//   { status: 'consumed' } — already redeemed
//   { status: 'expired' } — expires_at has passed
//   { status: 'valid', invite } — usable
export function inviteStatus(token) {
  const invite = getInvite(token);
  if (!invite) return { status: 'unknown' };
  if (invite.usedByUserId != null) return { status: 'consumed' };
  if (invite.expiresAt && Date.parse(invite.expiresAt) < Date.now()) {
    return { status: 'expired' };
  }
  return { status: 'valid', invite };
}

// Mark an invite consumed atomically. Returns true if we won the race; false
// if it was already used or doesn't exist. The UPDATE guards on
// used_by_user_id IS NULL so two simultaneous redemptions can't both succeed.
export function consumeInvite(token, userId) {
  const info = db.prepare(`
    UPDATE invite_tokens
    SET used_by_user_id = ?, used_at = datetime('now')
    WHERE token = ? AND used_by_user_id IS NULL
  `).run(userId, token);
  return info.changes > 0;
}
