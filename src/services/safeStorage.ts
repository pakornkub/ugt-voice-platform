// ponytail: Next.js server-renders 'use client' components once before hydration,
// so every localStorage call in this client-only data layer needs an SSR guard.
// No-ops on the server; identical to `localStorage` in the browser.
const isBrowser = typeof window !== 'undefined';

export const safeStorage = {
  getItem(key: string): string | null {
    return isBrowser ? window.localStorage.getItem(key) : null;
  },
  setItem(key: string, value: string): void {
    if (isBrowser) window.localStorage.setItem(key, value);
  },
  removeItem(key: string): void {
    if (isBrowser) window.localStorage.removeItem(key);
  },
};
