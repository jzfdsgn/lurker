import { defineStore } from 'pinia';
import { api } from '../api.js';

export const useAdminStore = defineStore('admin', {
  state: () => ({
    users: [],
    invites: [],
    usersLoaded: false,
    invitesLoaded: false,
    loading: false,
    error: '',
  }),
  actions: {
    async fetchUsers() {
      this.error = '';
      try {
        const { users } = await api('/api/admin/users');
        this.users = users || [];
        this.usersLoaded = true;
      } catch (e) {
        this.error = e.message || 'failed to load users';
        throw e;
      }
    },
    async deleteUser(id) {
      await api(`/api/admin/users/${id}`, { method: 'DELETE' });
      this.users = this.users.filter((u) => u.id !== id);
    },
    async fetchInvites() {
      this.error = '';
      try {
        const { invites } = await api('/api/admin/invites');
        this.invites = invites || [];
        this.invitesLoaded = true;
      } catch (e) {
        this.error = e.message || 'failed to load invites';
        throw e;
      }
    },
    async createInvite({ expiresInDays } = {}) {
      const { invite } = await api('/api/admin/invites', {
        method: 'POST',
        body: expiresInDays ? { expiresInDays } : {},
      });
      this.invites = [invite, ...this.invites];
      return invite;
    },
    async deleteInvite(token) {
      await api(`/api/admin/invites/${encodeURIComponent(token)}`, { method: 'DELETE' });
      this.invites = this.invites.filter((i) => i.token !== token);
    },
  },
});
