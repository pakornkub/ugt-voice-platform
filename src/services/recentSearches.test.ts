import { beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_COMPLAINTS } from '../mockData';
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
  removeRecentSearch,
} from './recentSearches';

beforeEach(() => {
  localStorage.clear();
});

describe('recent searches', () => {
  it('records hits and misses, de-duplicates by query and can remove / clear', () => {
    const ticket = INITIAL_COMPLAINTS[0];
    addRecentSearch(ticket.trackingCode, ticket);
    addRecentSearch('tk-9999-0000');
    addRecentSearch(ticket.trackingCode.toLowerCase(), ticket);

    const items = getRecentSearches();
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ found: true, trackingCode: ticket.trackingCode });
    expect(items[1]).toMatchObject({ found: false, trackingCode: 'TK-9999-0000' });

    expect(removeRecentSearch(items[0].id)).toHaveLength(1);
    clearRecentSearches();
    expect(getRecentSearches()).toEqual([]);
  });
});

describe('recent searches (same-millisecond ids)', () => {
  beforeEach(() => localStorage.clear());

  it('removes only the chosen item even when two are added in the same millisecond', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    addRecentSearch('TK-AAA-1111', undefined);
    addRecentSearch('TK-BBB-2222', undefined);
    vi.restoreAllMocks();

    const [first, second] = getRecentSearches();
    expect(first.id).not.toBe(second.id);
    removeRecentSearch(getRecentSearches().find((s) => s.query === 'TK-AAA-1111')!.id);
    expect(getRecentSearches().map((s) => s.query)).toEqual(['TK-BBB-2222']);
  });
});
