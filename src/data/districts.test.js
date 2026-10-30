import { describe, it, expect } from 'vitest';
import { DEFAULT_DISTRICT_ID, DISTRICTS, getDistrict } from './districts.js';

describe('districts', () => {
  it('has only Suan Luang, and falls back to it for any other id', () => {
    expect(DISTRICTS.map((d) => d.id)).toEqual(['suan-luang']);
    expect(DEFAULT_DISTRICT_ID).toBe('suan-luang');
    expect(getDistrict('don-mueang').id).toBe('suan-luang');
  });

  it('gives Suan Luang four frame corners and one focus outline', () => {
    const suanLuang = getDistrict('suan-luang');
    expect(Object.keys(suanLuang.frame.corners).sort()).toEqual(['bottomLeft', 'bottomRight', 'topLeft', 'topRight']);
    expect(suanLuang.boundaries.features.filter((f) => f.properties.role === 'focus')).toHaveLength(1);
  });

  it('uses the backend green image, park checks, GA sites and green groups, the example plots, and no heat map', () => {
    const suanLuang = getDistrict('suan-luang');
    expect(suanLuang.data).toEqual({ abandoned: true, parkChecks: true, gaSites: true, greenGroups: true });
    expect(suanLuang.images).toEqual({ green: expect.stringMatching(/green\.png/) });
    expect(suanLuang.greenSummary).toEqual({ greenM2: 2248297.5, validM2: 42000000, patches: 1554 });
    expect(suanLuang.frame.note).toBe('Position fitted from 83 of 85 backend GA sites (median error 0.4 m).');
    expect(suanLuang.frame.sizeM).toEqual([7000, 6000]);
  });
});
