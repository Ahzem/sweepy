import { describe, it, expect } from 'vitest';
import { formatBytes, getCategoryBadgeStyle, cn } from '../src/lib/utils';

describe('formatBytes', () => {
  it('formats zero bytes correctly', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats KB and MB correctly', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1024 * 1024)).toBe('1 MB');
    expect(formatBytes(5.5 * 1024 * 1024)).toBe('5.5 MB');
  });
});

describe('getCategoryBadgeStyle', () => {
  it('returns correct colors for categories', () => {
    const imgStyle = getCategoryBadgeStyle('Images');
    expect(imgStyle.bg).toContain('amber');

    const docStyle = getCategoryBadgeStyle('Documents');
    expect(docStyle.bg).toContain('blue');

    const codeStyle = getCategoryBadgeStyle('Code');
    expect(codeStyle.bg).toContain('emerald');

    const unknownStyle = getCategoryBadgeStyle('UnknownCat');
    expect(unknownStyle.bg).toContain('slate');
  });
});

describe('cn utility', () => {
  it('merges class names properly', () => {
    expect(cn('p-2', 'text-red-500', false && 'hidden')).toBe('p-2 text-red-500');
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });
});
