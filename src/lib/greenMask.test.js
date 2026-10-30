import { describe, it, expect } from 'vitest';
import { allPatches, describePatch, frameUV, maskFromRgba, patchAt, patchPixels } from './greenMask.js';
import { pointInFrame } from './geo.js';

// A 5 × 4 mask (1 = green):
//   1 1 0 0 0
//   0 1 0 1 0
//   0 0 0 1 1
//   1 0 0 0 1
const W = 5;
const H = 4;
const MASK = Uint8Array.from([1, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1]);

describe('maskFromRgba', () => {
  it('marks every pixel with some opacity as green', () => {
    const rgba = Uint8ClampedArray.from([0, 180, 65, 200, 0, 0, 0, 0, 0, 180, 65, 1]);
    expect(Array.from(maskFromRgba(rgba, 3, 1))).toEqual([1, 0, 1]);
  });
});

describe('frameUV', () => {
  // A slightly skewed frame, like a UTM image on a lat/lng map.
  const corners = { topLeft: [13.7539, 100.5947], topRight: [13.7535, 100.6595], bottomLeft: [13.6997, 100.5944], bottomRight: [13.6992, 100.6591] };

  it('finds (u, v) back from a point inside the frame', () => {
    for (const [u, v] of [[0.1, 0.2], [0.5, 0.5], [0.93, 0.71]]) {
      const [gu, gv] = frameUV(corners, pointInFrame(corners, u, v));
      expect(gu).toBeCloseTo(u, 9);
      expect(gv).toBeCloseTo(v, 9);
    }
  });

  it('is null outside the frame', () => {
    expect(frameUV(corners, pointInFrame(corners, 1.2, 0.5))).toBeNull();
  });
});

describe('patchAt', () => {
  it('finds the 4-connected patch under a pixel: corners touching diagonally are separate', () => {
    const patch = patchAt(MASK, W, H, 1, 1);
    expect(patch).toMatchObject({ id: 0, pixels: 3, bbox: [0, 0, 1, 1] });
    expect(patch.centroid[0]).toBeCloseTo((0.5 + 1.5 + 1.5) / 3, 9);
    expect(patch.centroid[1]).toBeCloseTo((0.5 + 0.5 + 1.5) / 3, 9);
  });

  it('gives the same patch, with the same id, from any of its pixels', () => {
    expect(patchAt(MASK, W, H, 4, 3)).toMatchObject({ id: 8, pixels: 4, bbox: [3, 1, 4, 3] });
    expect(patchAt(MASK, W, H, 3, 1).id).toBe(8);
  });

  it('handles a very large patch (a big park of 300,000 pixels)', () => {
    const big = new Uint8Array(600 * 500).fill(1);
    expect(patchAt(big, 600, 500, 599, 499)).toMatchObject({ id: 0, pixels: 300000, bbox: [0, 0, 599, 499] });
  });

  it('is null on a pixel that is not green or outside the image', () => {
    expect(patchAt(MASK, W, H, 2, 2)).toBeNull();
    expect(patchAt(MASK, W, H, 9, 0)).toBeNull();
  });
});

describe('describePatch', () => {
  it('turns a patch into map terms: area in m², centre point, and the corners of its box', () => {
    // The 5 × 4 mask laid over a 50 m × 40 m frame: 10 m pixels.
    const frame = { corners: { topLeft: [13.7004, 100.6], topRight: [13.7004, 100.6005], bottomLeft: [13.7, 100.6], bottomRight: [13.7, 100.6005] }, sizeM: [50, 40] };
    const patch = describePatch(patchAt(MASK, W, H, 4, 3), W, H, frame);
    expect(patch.id).toBe('patch-8');
    expect(patch.pixels).toBe(4);
    expect(patch.areaM2).toBe(400);
    expect(patch.lngLat[0]).toBeCloseTo(100.6 + 0.0005 * (4 / 5), 9);
    expect(patch.lngLat[1]).toBeCloseTo(13.7004 - 0.0004 * (2.5 / 4), 9);
    expect(patch.corners.topLeft[0]).toBeCloseTo(13.7004 - 0.0004 * (1 / 4), 9);
    expect(patch.corners.topLeft[1]).toBeCloseTo(100.6 + 0.0005 * (3 / 5), 9);
    expect(patch.corners.bottomRight[0]).toBeCloseTo(13.7, 9);
    expect(patch.corners.bottomRight[1]).toBeCloseTo(100.6005, 9);
  });
});

describe('allPatches', () => {
  it('lists every patch of the image once, in map terms, with the same ids as a click would give', () => {
    const frame = { corners: { topLeft: [13.7004, 100.6], topRight: [13.7004, 100.6005], bottomLeft: [13.7, 100.6], bottomRight: [13.7, 100.6005] }, sizeM: [50, 40] };
    const patches = allPatches(MASK, W, H, frame);
    expect(patches.map((p) => [p.id, p.pixels, p.areaM2])).toEqual([
      ['patch-0', 3, 300],
      ['patch-8', 4, 400],
      ['patch-15', 1, 100],
    ]);
    expect(patches[1].lngLat).toEqual(describePatch(patchAt(MASK, W, H, 4, 3), W, H, frame).lngLat);
  });
});

describe('patchPixels', () => {
  it("paints only the patch's own pixels inside its box", () => {
    const patch = patchAt(MASK, W, H, 4, 3); // box 2 × 3: columns 3–4, rows 1–3
    const pixels = patchPixels(patch, W, [255, 255, 0, 255]);
    const painted = Array.from({ length: 6 }, (_, i) => pixels[i * 4 + 3] > 0);
    expect(painted).toEqual([true, false, true, true, false, true]);
  });
});
