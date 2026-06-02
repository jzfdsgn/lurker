// Copyright (c) 2026 Brad Root
// SPDX-License-Identifier: MPL-2.0

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import net from 'net';
import { createIdentdServer, registerIdent, unregisterIdent } from './identd.js';

let server: net.Server;
let port: number;

beforeAll(async () => {
  server = createIdentdServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  port = (server.address() as net.AddressInfo).port;
});

afterAll(() => {
  server.close();
});

// Send one ident query line and collect the reply.
function query(line: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const c = net.connect(port, '127.0.0.1', () => c.write(line));
    let out = '';
    c.on('data', (d) => (out += d.toString()));
    c.on('end', () => resolve(out));
    c.on('error', reject);
  });
}

describe('built-in identd', () => {
  it('returns USERID for a registered local port', async () => {
    registerIdent(40001, 'u42');
    const res = await query('40001, 6667\r\n');
    expect(res.trim()).toBe('40001, 6667 : USERID : UNIX : u42');
  });

  it('returns NO-USER for an unregistered port', async () => {
    const res = await query('40002, 6667\r\n');
    expect(res.trim()).toBe('40002, 6667 : ERROR : NO-USER');
  });

  it('returns NO-USER after the port is unregistered', async () => {
    registerIdent(40003, 'u9');
    unregisterIdent(40003);
    const res = await query('40003, 6667\r\n');
    expect(res).toContain('ERROR : NO-USER');
  });

  it('rejects a malformed query', async () => {
    const res = await query('not a query\r\n');
    expect(res).toContain('ERROR : INVALID-PORT');
  });

  it('tolerates loose whitespace in the query', async () => {
    registerIdent(40004, 'u1');
    const res = await query('  40004 , 6667 \r\n');
    expect(res).toContain('USERID : UNIX : u1');
  });
});
