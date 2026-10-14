import { describe, expect, it } from 'vitest';
import { getRiskSeverityBadgeText, getUrgencyBadgeText } from './badges';
import { getStatusBadgeText } from '@/lib/ticket-status';

describe('badge text helpers', () => {
  it('localise by language', () => {
    expect(getStatusBadgeText('in_progress', 'en')).toBe('In Progress');
    expect(getStatusBadgeText('in_progress', 'th')).toContain('กำลังแก้ไข');
    expect(getUrgencyBadgeText('Critical', 'en')).toBe('🔥 Critical');
    expect(getUrgencyBadgeText('Critical', 'th')).toContain('วิกฤติ');
    expect(getRiskSeverityBadgeText('Severe', 'en')).toBe('Severe Risk');
    expect(getRiskSeverityBadgeText('Severe', 'th')).toContain('วิกฤติรุนแรง');
  });
});
