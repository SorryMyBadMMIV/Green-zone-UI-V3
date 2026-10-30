import { describe, it, expect } from 'vitest';
import { COLORS } from './constants.js';

// Hue of a #rrggbb colour in degrees (0–360).
function hue(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d === 0) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}
const hueGap = (a, b) => {
  const d = Math.abs(hue(a) - hue(b));
  return Math.min(d, 360 - d);
};

describe('map colours', () => {
  const parkCircles = { S: COLORS.parkS, M: COLORS.parkM, L: COLORS.parkL, XL: COLORS.parkXL };
  const others = { recommend: COLORS.recommendStar, greenGroups: COLORS.greenGroup, abandoned: COLORS.abandonedFill };

  it.each(Object.entries(parkCircles))('keeps the %s park circle colour clearly apart from Recommend, Green groups and the red plots', (_, park) => {
    for (const other of Object.values(others)) expect(hueGap(park, other)).toBeGreaterThanOrEqual(25);
  });

  it('gives the four park sizes four different colours', () => {
    expect(new Set(Object.values(parkCircles)).size).toBe(4);
  });
});
