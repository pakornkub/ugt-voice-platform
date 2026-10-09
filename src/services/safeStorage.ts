// ponytail: Next.js server-renders 'use client' components once before hydration,
// so every localStorage call in this client-only data layer needs an SSR guard.
// No-ops on the server; identical to `localStorage` in the browser.
const isBrowser = globalThis.window !== undefined;

export const safeStorage = {
  getItem(key: string): string | null {
    return isBrowser ? globalThis.localStorage.getItem(key) : null;
  },
  setItem(key: string, value: string): void {
    if (isBrowser) globalThis.localStorage.setItem(key, value);
  },
  removeItem(key: string): void {
    if (isBrowser) globalThis.localStorage.removeItem(key);
  },
};
