import { describe, it, expect } from 'vitest';
import { recommendLabel } from './RecommendMarkers.jsx';

describe('recommendLabel', () => {
  it('names a ★ as a recommended site from the backend GA, with its score, level and area (no rank)', () => {
    const site = { id: 'r0_c0-1', zone: 'r0_c0', rank: 1, areaM2: 25991.5 };
    expect(recommendLabel(site, { score: 78, level: { key: 'good', label: 'Good' } })).toBe('★ Recommended site (GA) · score 78 · Good · 25,992 m²');
  });

  it('names a site the app added in a gap as such', () => {
    const site = { id: 'patch-5', areaM2: 1225 };
    expect(recommendLabel(site, { score: 64, level: { key: 'good', label: 'Good' } }, true)).toBe('★ Added site (app) · score 64 · Good · 1,225 m²');
  });
});
