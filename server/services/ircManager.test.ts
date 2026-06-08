// Copyright (c) 2026 Brad Root
// SPDX-License-Identifier: MPL-2.0

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb } from '../test-utils/testApp.js';

// The startNetwork gate is the linchpin of the pause feature: a paused account
// can never construct an IrcConnection, so every downstream send/join/action
// no-ops for free. We can assert the paused path without opening a socket
// because it returns before connect() is ever reached.
const ctx = setupTestDb('services-ircmanager');

let ircManager: typeof import('./ircManager.js').default;
let createUser: typeof import('../db/users.js').createUser;
let setUserPaused: typeof import('../db/users.js').setUserPaused;
let createNetwork: typeof import('../db/networks.js').createNetwork;

beforeAll(async () => {
  ircManager = (await import('./ircManager.js')).default;
  ({ createUser, setUserPaused } = await import('../db/users.js'));
  ({ createNetwork } = await import('../db/networks.js'));
});

afterAll(() => ctx.cleanup());

describe('ircManager pause linchpin', () => {
  it('startNetwork refuses a paused user and creates no connection', () => {
    const user = createUser('irc-paused');
    const net = createNetwork(user.id, {
      name: 'n',
      host: 'irc.example.invalid',
      port: 6697,
      tls: true,
      nick: 'x',
      autoconnect: false,
    });
    if (!net) throw new Error('createNetwork returned undefined');

    setUserPaused(user.id, true);

    expect(ircManager.startNetwork(user.id, net.id)).toBeNull();
    expect(ircManager.getConnection(user.id, net.id)).toBeNull();
  });
});

describe('ircManager.snapshotForUser offline networks', () => {
  it('returns a disconnected blob for a network with no live connection', () => {
    const user = createUser('snap-offline');
    const net = createNetwork(user.id, {
      name: 'n',
      host: 'irc.example.invalid',
      port: 6697,
      tls: true,
      nick: 'zoe',
      autoconnect: false,
    });
    if (!net) throw new Error('createNetwork returned undefined');

    const snap = ircManager.snapshotForUser(user.id) as Array<Record<string, unknown>>;
    expect(snap).toHaveLength(1);
    expect(snap[0].networkId).toBe(net.id);
    expect(snap[0].state).toBe('disconnected');
    expect(snap[0].nick).toBe('zoe');
    expect(snap[0].channels).toEqual([]);
  });

  it('still snapshots a paused user’s networks so their buffers stay readable', () => {
    const user = createUser('snap-paused');
    const net = createNetwork(user.id, {
      name: 'n',
      host: 'irc.example.invalid',
      port: 6697,
      tls: true,
      nick: 'p',
      autoconnect: false,
    });
    if (!net) throw new Error('createNetwork returned undefined');
    setUserPaused(user.id, true);

    // The pause gate forbids a connection, yet the snapshot must not be empty —
    // otherwise the "you can read your history" banner has nothing to show.
    const snap = ircManager.snapshotForUser(user.id) as Array<Record<string, unknown>>;
    expect(snap).toHaveLength(1);
    expect(snap[0].networkId).toBe(net.id);
    expect(snap[0].state).toBe('disconnected');
  });
});
