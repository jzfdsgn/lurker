// Copyright (c) 2026 Brad Root
// SPDX-License-Identifier: Elastic-2.0

import { defineStore } from 'pinia';
import { api } from '../api.js';

export const usePushSubscriptionsStore = defineStore('pushSubscriptions', {
  state: () => ({
    subscriptions: [],
    loaded: false,
    loading: false,
    error: '',
  }),
  actions: {
    async fetchAll() {
      if (this.loading) return;
      this.loading = true;
      this.error = '';
      try {
        const { subscriptions } = await api('/api/push/subscriptions');
        this.subscriptions = subscriptions || [];
        this.loaded = true;
      } catch (e) {
        this.error = e.message || 'failed to load subscriptions';
        throw e;
      } finally {
        this.loading = false;
      }
    },
    async removeByEndpoint(endpoint) {
      await api('/api/push/subscriptions', { method: 'DELETE', body: { endpoint } });
      this.subscriptions = this.subscriptions.filter((s) => s.endpoint !== endpoint);
    },
  },
});
