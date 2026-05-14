// Copyright (c) 2026 Brad Root
// SPDX-License-Identifier: Elastic-2.0

// Parse the inline message-search syntax:
//   from:nick in:#channel on:network freetext...
// `from:` / `in:` / `on:` tokens are peeled off as structured filters;
// everything else is joined back as the free-text query. A bare prefix with no
// value (`from:`) or an unknown `word:` token is left in the free text — the
// FTS layer handles it harmlessly.
export function parseSearchQuery(raw) {
  const filters = { from: '', in: '', on: '' };
  const free = [];
  for (const token of String(raw || '').trim().split(/\s+/)) {
    if (!token) continue;
    const m = /^(from|in|on):(.+)$/i.exec(token);
    if (m) {
      filters[m[1].toLowerCase()] = m[2];
    } else {
      free.push(token);
    }
  }
  return { query: free.join(' '), ...filters };
}
