// Copyright (c) 2026 Brad Root
// SPDX-License-Identifier: MPL-2.0

// Mirrors irc-framework's outgoing splitter (client.sendMessage / client.action)
// so we can publish self-message events that match exactly what peers receive
// on the wire — one event per PRIVMSG sent. Without this, the sender's buffer
// shows a single long line while everyone else sees N chunks.
//
// We reuse irc-framework's own lineBreak() rather than reimplementing the
// byte/word/grapheme/codepoint cascade, so the split outcome is guaranteed to
// agree with what client.say()/client.action() actually transmits. The import
// reaches into the package's src/ tree — there's no exports map, so the path
// is stable for now; if a future irc-framework adds one, this will fail loudly
// at import time rather than silently diverging.
//
// Defaults match irc-framework: message_max_length=350 for PRIVMSG, and
// 350 - ('ACTION'.length + 3) = 341 for CTCP ACTION (the 3 covers the type
// name's leading space and the two \x01 SOH chars).
import { lineBreak } from 'irc-framework/src/linebreak.js';

const MESSAGE_MAX_BYTES = 350;
const ACTION_MAX_BYTES = MESSAGE_MAX_BYTES - ('ACTION'.length + 3);

function chunk(text: string, bytes: number): string[] {
  return [
    ...lineBreak(text, {
      bytes,
      allowBreakingWords: true,
      allowBreakingGraphemes: true,
    }),
  ];
}

// Split a PRIVMSG body the way irc-framework would: first on line breaks
// (each becomes its own series of wire messages — \n inside a PRIVMSG is
// illegal anyway), then byte-chunk each line.
export function splitSay(text: string | null | undefined): string[] {
  if (text == null || text === '') return [];
  const out: string[] = [];
  for (const line of text.split(/\r\n|\n|\r/)) {
    if (!line) continue;
    out.push(...chunk(line, MESSAGE_MAX_BYTES));
  }
  return out;
}

// CTCP ACTION doesn't pre-split on newlines (matching irc-framework). The
// budget is tighter to leave room for the wrapping \x01ACTION ... \x01.
export function splitAction(text: string | null | undefined): string[] {
  if (text == null || text === '') return [];
  return chunk(text, ACTION_MAX_BYTES);
}

// One PRIVMSG inside a `draft/multiline` batch. `concat` true means the line
// re-joins the previous one with NO newline — used when a single logical line
// overflowed the per-message byte budget and had to be split across the wire.
// The receiver reassembles by joining with '\n' except where concat is set.
export interface MultilineWireMessage {
  content: string;
  concat: boolean;
}

// Split a multi-line body into the sequence of PRIVMSGs that make up a
// `draft/multiline` batch. Unlike splitSay, we PRESERVE blank lines (an empty
// PRIVMSG with a trailing `:` round-trips as a blank line) so a pasted
// paragraph survives intact. Each source line is byte-chunked the same way the
// wire splitter does; the 2nd+ chunk of an over-long line carries concat so the
// receiver glues it back without inserting a newline mid-line. max-bytes /
// max-lines (the whole-batch budget the server advertises) is enforced by the
// caller — here we only respect the per-message wire limit.
export function splitMultiline(text: string | null | undefined): MultilineWireMessage[] {
  if (text == null || text === '') return [];
  const out: MultilineWireMessage[] = [];
  for (const line of text.split(/\r\n|\n|\r/)) {
    if (line === '') {
      out.push({ content: '', concat: false });
      continue;
    }
    chunk(line, MESSAGE_MAX_BYTES).forEach((part, i) => {
      out.push({ content: part, concat: i > 0 });
    });
  }
  return out;
}

function byteLen(s: string): number {
  return Buffer.byteLength(s, 'utf8');
}

export interface MultilineLimits {
  maxBytes: number;
  maxLines: number;
}

// Partition a multi-line body into one-or-more draft/multiline batches, each
// within the server's advertised max-lines (count of wire PRIVMSGs) and
// max-bytes (sum of content bytes). A logical line that had to be byte-split
// into concat continuations is kept whole inside a single batch so it never
// tears across a boundary. Returns one WireMessage[] per batch — so a body that
// fits is a single batch (one logical message), and a larger one becomes N
// batches instead of degrading to N raw lines. (#381)
export function partitionMultiline(
  text: string | null | undefined,
  limits: MultilineLimits,
): MultilineWireMessage[][] {
  const wires = splitMultiline(text);
  if (wires.length === 0) return [];
  // Re-group wire messages into logical lines (a head plus its concat tail).
  const logical: MultilineWireMessage[][] = [];
  for (const w of wires) {
    if (!w.concat || logical.length === 0) logical.push([w]);
    else logical[logical.length - 1].push(w);
  }
  const batches: MultilineWireMessage[][] = [];
  let cur: MultilineWireMessage[] = [];
  let curBytes = 0;
  for (const line of logical) {
    const lineBytes = line.reduce((n, w) => n + byteLen(w.content), 0);
    if (
      cur.length > 0 &&
      (cur.length + line.length > limits.maxLines || curBytes + lineBytes > limits.maxBytes)
    ) {
      batches.push(cur);
      cur = [];
      curBytes = 0;
    }
    cur.push(...line);
    curBytes += lineBytes;
  }
  if (cur.length > 0) batches.push(cur);
  return batches;
}

// Inverse of the receiver's reassembly: collapse a batch's wire messages back
// into the display text a multiline-capable peer would show (join with '\n'
// except across concat continuations). Used for the sender's local echo so each
// self bubble matches what the channel sees, one per batch. (#381)
export function reassembleMultiline(wires: MultilineWireMessage[]): string {
  let text = '';
  wires.forEach((w, i) => {
    if (i === 0) text = w.content;
    else text += w.concat ? w.content : `\n${w.content}`;
  });
  return text;
}
