import { useEffect, useState } from 'react';
import { maskFromRgba } from '../lib/greenMask.js';

/**
 * The green layer image as a pixel mask ({ mask, width, height }), so a click can find the green patch under it.
 * Loaded once per image URL, only while `enabled`; null until it is ready (or when there is no image).
 */
export default function useGreenMask(url, enabled) {
  const [state, setState] = useState({ url: null, value: null });

  useEffect(() => {
    if (!enabled || !url || state.url === url) return undefined;
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);
      const { data } = ctx.getImageData(0, 0, image.width, image.height);
      setState({ url, value: { mask: maskFromRgba(data, image.width, image.height), width: image.width, height: image.height } });
    };
    image.src = url;
    return () => {
      cancelled = true;
    };
  }, [url, enabled, state.url]);

  return state.url === url ? state.value : null;
}
