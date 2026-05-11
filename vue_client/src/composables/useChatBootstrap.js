import { onMounted } from 'vue';
import { useNetworksStore } from '../stores/networks.js';
import { useSettingsStore } from '../stores/settings.js';
import { startPresenceReporter, reportNow } from './usePresence.js';
import { registerSW, onSWPushMessage } from './usePush.js';

// Shared post-login bootstrap for the chat shells (Desktop + Mobile).
// onJump receives { networkId, target, messageId } when a push notification
// is clicked; each shell wires up its own handler since the mobile shell
// also needs to advance its screen state.
export function useChatBootstrap({ onJump } = {}) {
  const networks = useNetworksStore();
  const settings = useSettingsStore();

  onMounted(async () => {
    if (!settings.loaded) settings.fetchAll().catch(() => {});
    await networks.fetchAll();
    startPresenceReporter();
    reportNow();
    // Register unconditionally so a previously-subscribed device can still
    // receive push events without re-opening Settings. Per-client subscribe
    // is gated by an explicit Settings button (see usePush.enable()).
    registerSW().catch(() => { /* ignore */ });
    if (onJump) {
      onSWPushMessage((data) => {
        if (data?.kind === 'jump') onJump(data);
      });
    }
  });
}
