// Copyright (c) 2026 Brad Root
// SPDX-License-Identifier: MPL-2.0

// Shared candidate builder for channel completion — used by both Tab-completion
// in MessageInput and the `#`-triggered ChannelPicker. Returns the targets of
// joined channels matching `prefix` (case-insensitive), sorted alphabetically.
//
// `prefix` includes the leading '#' (it's the raw token under the cursor), and
// the '#' stays in every result — unlike nicks' '@' sugar, '#' is part of the
// channel name.
//
// Candidate source is deliberately just the buffers the user is already in:
// the point of channel completion is to quickly reference a channel you can
// tell someone else to join (the inserted `#channel` renders as a clickable
// join link for the recipient — see issue #154), so "joined channels" is
// exactly the right set. There is no /LIST-backed directory of channels you
// haven't joined.

interface ChannelBuffer {
  target?: string;
}

export function buildChannelCandidates(buffers: ChannelBuffer[], prefix: string): string[] {
  const lower = prefix.toLowerCase();
  return buffers
    .map((b) => b.target ?? '')
    .filter((t) => t.startsWith('#') && t.toLowerCase().startsWith(lower))
    .toSorted((a, b) => a.localeCompare(b));
}
