// Copyright (c) 2026 Brad Root
// SPDX-License-Identifier: MPL-2.0

// Generic touch long-press primitive. Returns a `bind(callback, payload?)`
// factory that produces the four touch handlers a row element needs:
//   <div v-bind="longPress.bind((coords, payload) => ...)">.
// The callback receives `{ clientX, clientY }` from the original touch and
// the optional payload the caller passed to `bind`. After a successful
// long-press, the next synthetic `click` on the same target is suppressed
// (touchend → click sequence on mobile) so the row's tap handler doesn't
// also fire. A subsequent contextmenu on the same gesture (iOS Safari fires
// one after touchend) is also suppressed.

export function useLongPress({ delay = 450, moveTolerance = 8 } = {}) {
  let timer = null;
  let startX = 0;
  let startY = 0;
  let suppressNextClick = false;
  let suppressNextContextMenu = false;
  let activeTarget = null;

  function cancel() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function bind(callback, payload) {
    return {
      onTouchstart(e) {
        if (!e.touches || e.touches.length !== 1) {
          cancel();
          return;
        }
        const t = e.touches[0];
        startX = t.clientX;
        startY = t.clientY;
        activeTarget = e.currentTarget;
        cancel();
        timer = setTimeout(() => {
          timer = null;
          suppressNextClick = true;
          suppressNextContextMenu = true;
          callback({ clientX: startX, clientY: startY }, payload);
        }, delay);
      },
      onTouchmove(e) {
        if (!timer || !e.touches || e.touches.length !== 1) return;
        const t = e.touches[0];
        if (Math.abs(t.clientX - startX) > moveTolerance
            || Math.abs(t.clientY - startY) > moveTolerance) {
          cancel();
        }
      },
      onTouchend() {
        cancel();
      },
      onTouchcancel() {
        cancel();
        activeTarget = null;
      },
      onClickCapture(e) {
        if (suppressNextClick) {
          suppressNextClick = false;
          e.preventDefault();
          e.stopPropagation();
        }
      },
      onContextmenuCapture(e) {
        if (suppressNextContextMenu) {
          suppressNextContextMenu = false;
          e.preventDefault();
          e.stopPropagation();
        }
      },
    };
  }

  return { bind, cancel };
}
