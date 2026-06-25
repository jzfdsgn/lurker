// Copyright (c) 2026 Brad Root
// SPDX-License-Identifier: MPL-2.0

// Client-side estimate of how many IRC lines a message will split into when
// the server hands it to irc-framework. We can't import the server-side
// helper (it imports from irc-framework's source tree) so this is a
// deliberately simpler port — word-greedy, byte-aware, accurate for ASCII
// and well-formed UTF-8. Pathological input (a 10kB string with no
// whitespace) might miscount by one chunk, which we accept: the UI hint is
// guidance, not a wire-level decision. The actual splitting still happens
// server-side via irc-framework's lineBreak().
//
// Constants mirror server/services/messageSplit.js — keep in sync if
// irc-framework ever bumps its message_max_length default.
export const MESSAGE_MAX_BYTES = 350;
export const ACTION_MAX_BYTES = MESSAGE_MAX_BYTES - ('ACTION'.length + 3);

const encoder = new TextEncoder();
function byteLen(s: string): number {
  return encoder.encode(s).byteLength;
}

// Greedy word-pack: walk whitespace-separated tokens, fit as many as we can
// into each chunk's byte budget, start a new chunk on overflow. If a single
// token exceeds the budget on its own, we approximate by counting how many
// budget-sized slices it'd take — close enough to irc-framework's
// grapheme/codepoint cascade for any input a human types.
function chunksForLine(line: string, bytes: number): number {
  if (!line) return 0;
  // Fast path: whole line fits.
  if (byteLen(line) <= bytes) return 1;

  let count = 0;
  let cur = '';
  let pendingWs = '';
  const tokens = line.split(/(\s+)/); // alternates non-ws, ws, non-ws, ws...

  const flushNew = (word: string): void => {
    if (cur) {
      count += 1;
      cur = '';
      pendingWs = '';
    }
    if (byteLen(word) <= bytes) {
      cur = word;
      return;
    }
    // Word alone won't fit — split into byte-sized slices. Iterate by code
    // point so we don't tear surrogate pairs.
    let acc = '';
    for (const cp of word) {
      if (byteLen(acc) + byteLen(cp) > bytes) {
        count += 1;
        acc = cp;
      } else {
        acc += cp;
      }
    }
    cur = acc;
  };

  for (const tok of tokens) {
    if (!tok) continue;
    if (/^\s+$/.test(tok)) {
      pendingWs = tok;
      continue;
    }
    if (!cur) {
      flushNew(tok);
      continue;
    }
    if (byteLen(cur) + byteLen(pendingWs) + byteLen(tok) <= bytes) {
      cur += pendingWs + tok;
      pendingWs = '';
    } else {
      flushNew(tok);
    }
  }
  if (cur) count += 1;
  return count;
}

// PRIVMSG path: split on newlines first (each line independently chunked),
// matching what irc-framework's sendMessage() does.
export function chunkCountForSay(text: string | null | undefined): number {
  if (!text) return 0;
  let total = 0;
  for (const line of text.split(/\r\n|\n|\r/)) {
    if (!line) continue;
    total += chunksForLine(line, MESSAGE_MAX_BYTES);
  }
  return total;
}

// CTCP ACTION path: no newline pre-split (matches irc-framework), tighter
// budget to leave room for the \x01ACTION ... \x01 wrapper.
export function chunkCountForAction(text: string | null | undefined): number {
  if (!text) return 0;
  return chunksForLine(text, ACTION_MAX_BYTES);
}

export interface MultilineLimits {
  maxBytes: number;
  maxLines: number;
}

// How many draft/multiline batches a plain multi-line body will produce on a
// network that negotiated the cap — i.e. how many logical messages the channel
// will see. Returns 0 when the send won't be multiline at all (no embedded
// newline, or the network lacks the cap), so callers treat 0 as "fall back to
// the wire-chunk estimate". 1 = a single batch (no flood); ≥2 = that many
// messages, NOT N raw lines.
//
// This mirrors the server's partitionMultiline (server/services/messageSplit):
// pack logical lines into batches under max-lines (count of wire PRIVMSGs) and
// max-bytes (utf-8 content bytes). The per-line wire count is approximated as
// ceil(bytes / MESSAGE_MAX_BYTES) rather than the word-greedy split — exact for
// the common case (lines under the wire limit) and close enough otherwise; the
// hint is guidance, the wire-level partition still happens server-side.
export function multilineMessageCount(
  text: string | null | undefined,
  limits: MultilineLimits | null | undefined,
): number {
  if (!text || !limits) return 0;
  if (!/\r\n|\n|\r/.test(text)) return 0;
  let batches = 1;
  let curLines = 0;
  let curBytes = 0;
  for (const line of text.split(/\r\n|\n|\r/)) {
    const lineBytes = byteLen(line);
    const wireLines = Math.max(1, Math.ceil(lineBytes / MESSAGE_MAX_BYTES));
    if (
      curLines > 0 &&
      (curLines + wireLines > limits.maxLines || curBytes + lineBytes > limits.maxBytes)
    ) {
      batches += 1;
      curLines = 0;
      curBytes = 0;
    }
    curLines += wireLines;
    curBytes += lineBytes;
  }
  return batches;
}
