// Copyright (c) 2026 Brad Root
// SPDX-License-Identifier: MPL-2.0

import { describe, it, expect } from 'vitest';
import {
  chunkCountForSay,
  chunkCountForAction,
  multilineMessageCount,
  MESSAGE_MAX_BYTES,
  ACTION_MAX_BYTES,
} from './messageSplit.js';

describe('chunkCountForSay', () => {
  it('returns 0 for empty input', () => {
    expect(chunkCountForSay('')).toBe(0);
    expect(chunkCountForSay(null)).toBe(0);
    expect(chunkCountForSay(undefined)).toBe(0);
  });

  it('returns 1 for short ASCII input', () => {
    expect(chunkCountForSay('hello world')).toBe(1);
  });

  it('returns 1 for input right at the byte limit', () => {
    expect(chunkCountForSay('a'.repeat(MESSAGE_MAX_BYTES))).toBe(1);
  });

  it('returns 2 for input one byte over the limit (word-greedy)', () => {
    // 350 'a's plus a space and a single character at the end forces a
    // second chunk via the word boundary.
    const text = `${'a'.repeat(MESSAGE_MAX_BYTES - 5)} extra`;
    expect(chunkCountForSay(text)).toBe(2);
  });

  it('returns 3 for ~2.5x the limit of word-broken text', () => {
    const word = 'foo ';
    const text = word.repeat(Math.ceil((MESSAGE_MAX_BYTES * 2.5) / word.length));
    expect(chunkCountForSay(text)).toBe(3);
  });

  it('counts newlines as chunk boundaries', () => {
    expect(chunkCountForSay('one\ntwo')).toBe(2);
    expect(chunkCountForSay('one\r\ntwo\rthree')).toBe(3);
  });

  it('drops empty lines (matches server-side behavior)', () => {
    expect(chunkCountForSay('one\n\ntwo')).toBe(2);
  });

  it('respects byte length for multi-byte UTF-8', () => {
    // 100 fire emojis = 400 bytes > 350, must split.
    expect(chunkCountForSay('🔥'.repeat(100))).toBeGreaterThanOrEqual(2);
  });

  it('handles a single oversize word by slicing it', () => {
    // 1000 chars with no whitespace — single token wider than budget.
    const count = chunkCountForSay('a'.repeat(1000));
    // 1000 / 350 = 2.86, so at least 3 chunks.
    expect(count).toBeGreaterThanOrEqual(3);
  });
});

describe('chunkCountForAction', () => {
  it('uses the tighter ACTION budget', () => {
    // A line that fits in PRIVMSG (350) but not in ACTION (341) → 1 chunk
    // for say, 2 for action.
    const text = 'a'.repeat(345);
    expect(chunkCountForSay(text)).toBe(1);
    expect(chunkCountForAction(text)).toBe(2);
  });

  it('does not split on newlines (matches irc-framework)', () => {
    // irc-framework's client.action doesn't pre-split on newlines, so
    // neither do we.
    expect(chunkCountForAction('one\ntwo')).toBe(1);
  });

  it('respects the lower limit value', () => {
    expect(ACTION_MAX_BYTES).toBeLessThan(MESSAGE_MAX_BYTES);
    expect(MESSAGE_MAX_BYTES - ACTION_MAX_BYTES).toBe('ACTION'.length + 3);
  });

  it('returns 0 for empty', () => {
    expect(chunkCountForAction('')).toBe(0);
  });
});

describe('multilineMessageCount', () => {
  const limits = { maxBytes: 4096, maxLines: 24 };

  it('is 0 without negotiated limits', () => {
    expect(multilineMessageCount('a\nb', null)).toBe(0);
    expect(multilineMessageCount('a\nb', undefined)).toBe(0);
  });

  it('is 0 for a single-line body (not a multiline send)', () => {
    expect(multilineMessageCount('just one line', limits)).toBe(0);
    expect(multilineMessageCount('a'.repeat(1000), limits)).toBe(0);
  });

  it('is 1 for a multi-line body within the limits', () => {
    expect(multilineMessageCount('line one\nline two', limits)).toBe(1);
    expect(multilineMessageCount('a\n\nb', limits)).toBe(1); // blank line counts
  });

  it('counts the batches when the body exceeds the line budget', () => {
    // 25 single-line entries, max-lines 24 → 2 batches (24 + 1).
    const lines = Array.from({ length: 25 }, (_, i) => `l${i}`).join('\n');
    expect(multilineMessageCount(lines, { maxBytes: 4096, maxLines: 24 })).toBe(2);
    // 49 entries → 3 batches.
    const more = Array.from({ length: 49 }, (_, i) => `l${i}`).join('\n');
    expect(multilineMessageCount(more, { maxBytes: 4096, maxLines: 24 })).toBe(3);
  });

  it('counts the batches when the body exceeds the byte budget', () => {
    // Two 60-byte lines, max-bytes 100 → 2 batches (one line each).
    expect(
      multilineMessageCount(`${'a'.repeat(60)}\n${'b'.repeat(60)}`, {
        maxBytes: 100,
        maxLines: 24,
      }),
    ).toBe(2);
  });

  it('counts utf-8 bytes, not characters, for the byte budget', () => {
    // 15 × 4-byte emoji per line = 60 bytes each.
    const body = `${'🔥'.repeat(15)}\n${'🔥'.repeat(15)}`;
    expect(multilineMessageCount(body, { maxBytes: 100, maxLines: 24 })).toBe(2); // 120 > 100
    expect(multilineMessageCount(body, { maxBytes: 200, maxLines: 24 })).toBe(1); // 120 ≤ 200
  });
});
