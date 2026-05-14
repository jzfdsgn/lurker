// Copyright (c) 2026 Brad Root
// SPDX-License-Identifier: Elastic-2.0

import { computed } from 'vue';
import { useSettingsStore } from '../stores/settings.js';
import { nickColor, splitTextByTokens } from '../utils/nickColor.js';

// Provides reactive helpers that read coloring options from the settings store.
//   const nicks = useNickColors();
//   nicks.color(nick)                        -> color string or null
//   nicks.splitText(text, nickSet, selfLower) -> segments (URLs + nicks + text)
//   nicks.selfColor.value                     -> CSS color for own nick
export function useNickColors() {
  const settings = useSettingsStore();

  const palette = computed(() => settings.effective('look.nick.colors'));
  const stopChars = computed(() => settings.effective('look.nick.color_stop_chars'));
  const selfColor = computed(() => settings.effective('look.nick.self_color'));

  function color(nick) {
    return nickColor(nick, { palette: palette.value, stopChars: stopChars.value });
  }

  function splitText(text, nickSet, selfLower) {
    return splitTextByTokens(text, nickSet, selfLower, color);
  }

  return { color, splitText, selfColor };
}
