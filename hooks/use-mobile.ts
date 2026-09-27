import { useSyncExternalStore } from 'react';

const MOBILE_BREAKPOINT = 768;
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

// Rewritten from shadcn's version (which set state inside useEffect, flagged by React's lint rules).
// useSyncExternalStore is React's way to read a value that lives outside React (here: the window
// width): it subscribes to changes and re-renders only when the value actually changes.
function subscribe(onChange: () => void) {
   const mql = window.matchMedia(MOBILE_QUERY);
   mql.addEventListener('change', onChange);
   return () => mql.removeEventListener('change', onChange);
}

export function useIsMobile() {
   return useSyncExternalStore(
      subscribe,
      () => window.matchMedia(MOBILE_QUERY).matches, // in the browser
      () => false // on the server (no window): render the desktop layout first
   );
}
