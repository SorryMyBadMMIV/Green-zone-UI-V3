// The backend green layer as a pixel mask, so a click on the map can find the green patch under it.
import { pointInFrame } from './geo.js';

/** 1 for every pixel of the green layer image (RGBA, row by row) that has some opacity, else 0. */
export function maskFromRgba(data, width, height) {
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3] > 0 ? 1 : 0;
  return mask;
}

/**
 * (u, v) of a [lng, lat] point in a four-corner frame: the inverse of pointInFrame (u from the west edge, v from the
 * north edge, both 0 → 1). A few Newton steps on the bilinear map; null when the point is outside the frame.
 */
export function frameUV(corners, [lng, lat]) {
  const { topLeft: tl, topRight: tr, bottomLeft: bl, bottomRight: br } = corners;
  let u = 0.5;
  let v = 0.5;
  for (let step = 0; step < 8; step++) {
    const [x, y] = pointInFrame(corners, u, v);
    const fx = x - lng;
    const fy = y - lat;
    // Partial derivatives of [lng, lat] by u and v (corners are [lat, lng]).
    const dxu = (1 - v) * (tr[1] - tl[1]) + v * (br[1] - bl[1]);
    const dyu = (1 - v) * (tr[0] - tl[0]) + v * (br[0] - bl[0]);
    const dxv = (1 - u) * (bl[1] - tl[1]) + u * (br[1] - tr[1]);
    const dyv = (1 - u) * (bl[0] - tl[0]) + u * (br[0] - tr[0]);
    const det = dxu * dyv - dxv * dyu;
    u -= (fx * dyv - fy * dxv) / det;
    v -= (fy * dxu - fx * dyu) / det;
  }
  const inside = (t) => t >= -1e-9 && t <= 1 + 1e-9;
  return inside(u) && inside(v) ? [u, v] : null;
}

/**
 * The 4-connected green patch (the backend's own patch rule) under pixel (col, row), or null when that pixel is not
 * green. id = the patch's smallest pixel index, so every pixel of a patch gives the same id. bbox = [c0, r0, c1, r1],
 * centroid = [col, row] of the pixel centres, cells = the patch's pixel indices.
 */
export function patchAt(mask, width, height, col, row) {
  if (col < 0 || row < 0 || col >= width || row >= height || !mask[row * width + col]) return null;
  return floodPatch(mask, width, height, row * width + col, new Uint8Array(mask.length));
}

/** Every patch of the mask once, in map terms (see describePatch), in the order of their ids. */
export function allPatches(mask, width, height, frame) {
  const seen = new Uint8Array(mask.length);
  const patches = [];
  for (let index = 0; index < mask.length; index++) {
    if (mask[index] && !seen[index]) patches.push(describePatch(floodPatch(mask, width, height, index, seen), width, height, frame));
  }
  return patches;
}

/** The patch grown from pixel `start` over 4-connected green pixels; marks them in `seen`. */
function floodPatch(mask, width, height, start, seen) {
  const cells = [];
  const stack = [start];
  seen[start] = 1;
  while (stack.length) {
    const index = stack.pop();
    cells.push(index);
    const c = index % width;
    const r = (index - c) / width;
    const next = [c > 0 && index - 1, c < width - 1 && index + 1, r > 0 && index - width, r < height - 1 && index + width];
    for (const n of next) {
      if (n !== false && mask[n] && !seen[n]) {
        seen[n] = 1;
        stack.push(n);
      }
    }
  }
  let id = Infinity;
  let c0 = width;
  let r0 = height;
  let c1 = 0;
  let r1 = 0;
  let sumC = 0;
  let sumR = 0;
  for (const index of cells) {
    id = Math.min(id, index);
    const c = index % width;
    const r = (index - c) / width;
    c0 = Math.min(c0, c);
    c1 = Math.max(c1, c);
    r0 = Math.min(r0, r);
    r1 = Math.max(r1, r);
    sumC += c + 0.5;
    sumR += r + 0.5;
  }
  return {
    id,
    pixels: cells.length,
    bbox: [c0, r0, c1, r1],
    centroid: [sumC / cells.length, sumR / cells.length],
    cells: Int32Array.from(cells),
  };
}

/** RGBA pixels (row by row) of the patch's box, with only the patch's own pixels painted in `rgba`. */
export function patchPixels(patch, width, rgba) {
  const [c0, r0, c1, r1] = patch.bbox;
  const w = c1 - c0 + 1;
  const pixels = new Uint8ClampedArray(w * (r1 - r0 + 1) * 4);
  for (const index of patch.cells) {
    const c = index % width;
    const r = (index - c) / width;
    pixels.set(rgba, ((r - r0) * w + (c - c0)) * 4);
  }
  return pixels;
}

/**
 * A patch in map terms: id, pixels, area in m² (pixels × the frame's pixel size, frame.sizeM = [width, height] in m),
 * centre as [lng, lat], and the four corners ([lat, lng]) of its box, for drawing it highlighted.
 */
export function describePatch(patch, width, height, frame) {
  const [c0, r0, c1, r1] = patch.bbox;
  const at = (col, row) => {
    const [lng, lat] = pointInFrame(frame.corners, col / width, row / height);
    return [lat, lng];
  };
  return {
    id: `patch-${patch.id}`,
    pixels: patch.pixels,
    areaM2: patch.pixels * (frame.sizeM[0] / width) * (frame.sizeM[1] / height),
    lngLat: pointInFrame(frame.corners, patch.centroid[0] / width, patch.centroid[1] / height),
    corners: { topLeft: at(c0, r0), topRight: at(c1 + 1, r0), bottomLeft: at(c0, r1 + 1), bottomRight: at(c1 + 1, r1 + 1) },
  };
}
