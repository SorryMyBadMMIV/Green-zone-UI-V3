import { describe, it, expect } from 'vitest';
import { affineFromPoints } from './raster.js';

const apply = ([a, b, c, d, e, f], [x, y]) => [a * x + c * y + e, b * x + d * y + f];

describe('affineFromPoints', () => {
  it('maps the three source points onto the three destination points', () => {
    const src = [[0, 0], [600, 0], [0, 600]];
    const dst = [[12.5, 40], [300.25, 35.5], [20, 330]];
    const transform = affineFromPoints(src, dst);
    src.forEach((point, i) => {
      const [x, y] = apply(transform, point);
      expect(x).toBeCloseTo(dst[i][0], 9);
      expect(y).toBeCloseTo(dst[i][1], 9);
    });
  });
});
