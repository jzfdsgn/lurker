// Copyright (c) 2026 Brad Root
// SPDX-License-Identifier: MPL-2.0

import db from './index.js';

/** A row from `channel_notify_settings`. */
export interface ChannelNotifySetting {
  user_id: number;
  network_id: number;
  target: string;
  notify_always: number;
  muted: number;
  updated_at: string;
}

/** Per-target settings shape returned to callers. */
export interface ChannelNotifyShape {
  notifyAlways: boolean;
  muted: boolean;
}

// Per-(user, network, channel) overrides. Two independent flags live here:
//   notify_always — treat every message in the channel like a notification
//                   trigger for push/toast purposes (no visual highlight).
//   muted         — buffer-list display only: suppress the plain-unread signal
//                   (count + row color + off-screen unread arrow). Highlights
//                   and notifications are untouched.
// The flags are orthogonal, so a row persists as long as EITHER is set; the
// row is deleted only when both fall back to 0 (absent row = all flags off).

const getStmt = db.prepare(`
  SELECT notify_always, muted FROM channel_notify_settings
  WHERE user_id = ? AND network_id = ? AND target = ?
`);

const listForUserStmt = db.prepare(`
  SELECT network_id AS networkId, target,
         notify_always AS notifyAlways, muted AS muted
  FROM channel_notify_settings
  WHERE user_id = ?
`);

const upsertStmt = db.prepare(`
  INSERT INTO channel_notify_settings (user_id, network_id, target, notify_always, muted, updated_at)
  VALUES (?, ?, ?, ?, ?, datetime('now'))
  ON CONFLICT(user_id, network_id, target)
  DO UPDATE SET notify_always = excluded.notify_always,
                muted = excluded.muted,
                updated_at = excluded.updated_at
`);

const deleteStmt = db.prepare(`
  DELETE FROM channel_notify_settings
  WHERE user_id = ? AND network_id = ? AND target = ?
`);

/** Current flags for a channel as 0/1 ints (both 0 when no row exists). */
function currentFlags(
  userId: number,
  networkId: number,
  target: string,
): { notifyAlways: number; muted: number } {
  const row = getStmt.get(userId, networkId, target) as
    | { notify_always: number; muted: number }
    | undefined;
  return {
    notifyAlways: row && row.notify_always ? 1 : 0,
    muted: row && row.muted ? 1 : 0,
  };
}

// Write the resulting flag pair: upsert while either flag is set, delete the
// row outright once both are 0 so we never leave all-default rows behind.
function write(
  userId: number,
  networkId: number,
  target: string,
  notifyAlways: number,
  muted: number,
): void {
  if (notifyAlways || muted) {
    upsertStmt.run(userId, networkId, target, notifyAlways, muted);
  } else {
    deleteStmt.run(userId, networkId, target);
  }
}

export function getChannelNotifyAlways(userId: number, networkId: number, target: string): boolean {
  return !!currentFlags(userId, networkId, target).notifyAlways;
}

export function getChannelMuted(userId: number, networkId: number, target: string): boolean {
  return !!currentFlags(userId, networkId, target).muted;
}

/** Both flags for a channel — used by the WS layer to broadcast full state. */
export function getChannelFlags(
  userId: number,
  networkId: number,
  target: string,
): ChannelNotifyShape {
  const f = currentFlags(userId, networkId, target);
  return { notifyAlways: !!f.notifyAlways, muted: !!f.muted };
}

// Map<networkId, { [target]: { notifyAlways, muted } }> snapshot for the whole
// user, shaped to drop straight into the client's channelNotify store.
export function listChannelNotifyForUser(
  userId: number,
): Map<number, Record<string, ChannelNotifyShape>> {
  const byNetwork = new Map<number, Record<string, ChannelNotifyShape>>();
  for (const row of listForUserStmt.all(userId) as Array<{
    networkId: number;
    target: string;
    notifyAlways: number;
    muted: number;
  }>) {
    if (!byNetwork.has(row.networkId)) byNetwork.set(row.networkId, {});
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    byNetwork.get(row.networkId)![row.target] = {
      notifyAlways: !!row.notifyAlways,
      muted: !!row.muted,
    };
  }
  return byNetwork;
}

export function setChannelNotifyAlways(
  userId: number,
  networkId: number,
  target: string,
  notifyAlways: boolean,
): void {
  const cur = currentFlags(userId, networkId, target);
  write(userId, networkId, target, notifyAlways ? 1 : 0, cur.muted);
}

export function setChannelMuted(
  userId: number,
  networkId: number,
  target: string,
  muted: boolean,
): void {
  const cur = currentFlags(userId, networkId, target);
  write(userId, networkId, target, cur.notifyAlways, muted ? 1 : 0);
}
