import { describe, it, expect } from 'vitest';
import { recommendLabel } from './RecommendMarkers.jsx';

describe('recommendLabel', () => {
  const site = { id: 'r0_c0-1', zone: 'r0_c0', rank: 1, areaM2: 25991.5 };

  it('names a ★ as a recommended site from the backend GA, with its rank in its 1 km square and its area', () => {
    expect(recommendLabel(site, 2)).toBe('★ Recommended site (GA) · rank 1 of 2 in its 1 km square · 25,992 m²');
  });

  it('leaves out "of N" when the count is unknown', () => {
    expect(recommendLabel(site, undefined)).toBe('★ Recommended site (GA) · rank 1 in its 1 km square · 25,992 m²');
  });
});
