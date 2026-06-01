// Copyright (c) 2026 Brad Root
// SPDX-License-Identifier: MPL-2.0

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Node edition + a throwaway DB, set before any db import. In node edition a
// cell has no operator-admin, so the "promote the first user" recovery must NOT
// fire — otherwise a restart would silently make a tenant an admin.
process.env.LURKER_EDITION = 'node';
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lurker-test-firstadmin-'));
process.env.DATABASE_PATH = path.join(tmpDir, 'test.db');

let index: typeof import('./index.js');
let users: typeof import('./users.js');

beforeAll(async () => {
  index = await import('./index.js');
  users = await import('./users.js');
});

afterAll(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

describe('backfillFirstAdmin in node edition', () => {
  it('never promotes a tenant to admin (no operator-admin on a cell)', () => {
    users.createUser('tenant-a');
    users.createUser('tenant-b');
    expect(users.countAdmins()).toBe(0);

    // Simulates a cell restart's migration step — must remain a no-op here.
    index.backfillFirstAdmin();
    expect(users.countAdmins()).toBe(0);
  });
});
