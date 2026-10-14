import type { ComplaintTicket, RecentSearchItem } from '../types';
import { safeStorage } from './safeStorage';

// Collision-free local id. Upstream used `${Date.now()}-${random 0-999}`, which repeats when two
// items are created in the same millisecond — removing one recent search then removed both.
// crypto.randomUUID exists in every place this runs (HTTPS/localhost browsers, Node 22, jsdom).
const uniqueId = (prefix: string): string => `${prefix}-${globalThis.crypto.randomUUID()}`;

const STORAGE_KEY_RECENT_SEARCHES = 'enterprise_grievance_recent_searches_v1';

export function getRecentSearches(): RecentSearchItem[] {
  if (globalThis.window === undefined) return [];
  const stored = safeStorage.getItem(STORAGE_KEY_RECENT_SEARCHES);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to parse recent searches:', e);
    return [];
  }
}

export function saveRecentSearches(items: RecentSearchItem[]): void {
  if (globalThis.window === undefined) return;
  safeStorage.setItem(STORAGE_KEY_RECENT_SEARCHES, JSON.stringify(items));
}

export function addRecentSearch(query: string, ticket?: ComplaintTicket | null): RecentSearchItem {
  const current = getRecentSearches();
  const trimmed = query.trim();

  // Remove existing entry with the same query or tracking code to prevent duplicate clutter
  const filtered = current.filter(
    (item) =>
      item.query.toLowerCase() !== trimmed.toLowerCase() &&
      (!ticket || item.trackingCode?.toLowerCase() !== ticket.trackingCode.toLowerCase())
  );

  const newItem: RecentSearchItem = {
    id: uniqueId('search'),
    query: trimmed,
    timestamp: new Date().toISOString(),
    ticketId: ticket?.id,
    trackingCode:
      ticket?.trackingCode ||
      (trimmed.toUpperCase().startsWith('TK-') ? trimmed.toUpperCase() : undefined),
    title: ticket?.title,
    category: ticket?.category,
    urgency: ticket?.urgency,
    status: ticket?.status,
    found: !!ticket,
    submitterName: ticket?.submitterName,
  };

  // Keep up to 30 recent searches
  const updated = [newItem, ...filtered].slice(0, 30);
  saveRecentSearches(updated);
  return newItem;
}

export function removeRecentSearch(id: string): RecentSearchItem[] {
  const current = getRecentSearches();
  const updated = current.filter((item) => item.id !== id);
  saveRecentSearches(updated);
  return updated;
}

export function clearRecentSearches(): void {
  if (globalThis.window === undefined) return;
  safeStorage.removeItem(STORAGE_KEY_RECENT_SEARCHES);
}
