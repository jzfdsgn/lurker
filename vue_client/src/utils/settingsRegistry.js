// Client-side wrapper around the shared settings registry. Re-exports the
// data + shared helpers and adds getDefault(), the lookup pattern the
// Settings UI uses to seed inputs before the user-saved values arrive.

import { REGISTRY, getOption, defaultsAsObject } from '../../../shared/settingsRegistry.js';

export { REGISTRY, getOption, defaultsAsObject };

export function getDefault(key) {
  const opt = getOption(key);
  return opt ? opt.default : undefined;
}
