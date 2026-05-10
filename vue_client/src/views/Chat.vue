<template>
  <MobileChat v-if="isMobile" />
  <DesktopChat v-else />
</template>

<script setup>
import { useViewport } from '../composables/useViewport.js';
import DesktopChat from './DesktopChat.vue';
import MobileChat from './MobileChat.vue';

const { isMobile } = useViewport();
</script>
