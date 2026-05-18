<!--
  Copyright (c) 2026 Brad Root
  SPDX-License-Identifier: MPL-2.0
-->

<template>
  <template v-for="(seg, i) in segments" :key="i">
    <a
      v-if="seg.url"
      class="msg-link"
      :href="seg.url"
      target="_blank"
      rel="noreferrer noopener"
      :style="styleFor(seg)"
    >{{ seg.text }}</a>
    <span v-else-if="hasStyle(seg)" :style="styleFor(seg)">{{ seg.text }}</span>
    <template v-else>{{ seg.text }}</template>
  </template>
</template>

<script setup>
import { computed } from 'vue';
import { splitTextByTokens, segmentInlineStyle, segmentHasStyle } from '../utils/nickColor.js';

// Renders a plain-text string with URLs auto-linked and IRC formatting
// (bold/italic/underline/strike + mIRC fg colours) applied. Used by every
// line type in MessageList that doesn't go through nick coloring (motd,
// errors, part reasons, etc.) and by the topic bar in Chat.vue. Lines that
// DO get nick coloring (message/notice/action) call splitTextByTokens
// directly with a real nickSet.
const props = defineProps({
  text: { type: String, default: '' },
});

const segments = computed(() => splitTextByTokens(props.text, null, null, null));
function styleFor(seg) { return segmentInlineStyle(seg, null); }
function hasStyle(seg) { return segmentHasStyle(seg); }
</script>
