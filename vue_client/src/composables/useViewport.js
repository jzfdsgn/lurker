import { ref, onMounted, onBeforeUnmount } from 'vue';

// Mobile breakpoint. The desktop layout is a 220 + 1fr + 180 = 400px-of-chrome
// grid, so anything below ~720px gets squeezed beyond repair. 768px is a
// conventional tablet-portrait threshold and gives a comfortable margin.
const MOBILE_QUERY = '(max-width: 768px)';

// One shared MediaQueryList — cheaper than per-component listeners and means
// every consumer flips at the exact same moment when the viewport crosses
// the breakpoint.
let mql = null;
const isMobile = ref(false);
let initialized = false;

function ensureInit() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  mql = window.matchMedia(MOBILE_QUERY);
  isMobile.value = mql.matches;
  // addEventListener is the modern path; older Safari needs addListener.
  if (mql.addEventListener) mql.addEventListener('change', onChange);
  else mql.addListener(onChange);
}

function onChange(e) {
  isMobile.value = e.matches;
}

export function useViewport() {
  ensureInit();
  return { isMobile };
}

// visualViewport tracks the actual visible area, which on iOS Safari shrinks
// when the soft keyboard opens. `100dvh` alone doesn't react to the keyboard
// — it accounts for browser chrome, not virtual keyboards. We write the
// visible height into --viewport-h so the mobile shell can stay glued to the
// visible region instead of being pushed offscreen by the keyboard.
export function useVisualViewportHeight() {
  const installed = ref(false);
  function update() {
    const vv = window.visualViewport;
    const h = vv ? vv.height : window.innerHeight;
    document.documentElement.style.setProperty('--viewport-h', `${h}px`);
  }
  onMounted(() => {
    if (typeof window === 'undefined') return;
    update();
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', update);
      window.visualViewport.addEventListener('scroll', update);
    }
    window.addEventListener('resize', update);
    installed.value = true;
  });
  onBeforeUnmount(() => {
    if (typeof window === 'undefined') return;
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', update);
      window.visualViewport.removeEventListener('scroll', update);
    }
    window.removeEventListener('resize', update);
  });
  return { installed };
}
