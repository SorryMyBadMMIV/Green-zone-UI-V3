import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import useMapData from './useMapData.js';
import { fetchDistrictData } from '../api/data.js';

vi.mock('../api/data.js', () => ({ fetchDistrictData: vi.fn() }));

const collection = (id) => ({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: null, properties: { id } }] });
// Two districts: the hook works the same for any number of them.
const first = { id: 'first' };
const second = { id: 'second' };
const dataFor = (district) => ({
  abandoned: collection(`${district.id}-plot`),
  parkChecks: null,
  gaSites: collection(`${district.id}-site`),
  greenGroups: district === first ? collection('1') : null,
});

beforeEach(() => {
  vi.mocked(fetchDistrictData).mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useMapData', () => {
  it("loads the district's data, then becomes ready", async () => {
    vi.mocked(fetchDistrictData).mockImplementation(async (district) => dataFor(district));
    const { result } = renderHook(() => useMapData(first));
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.gaSites.features[0].properties.id).toBe('first-site');
    expect(result.current.greenGroups.features).toHaveLength(1);
    expect(fetchDistrictData).toHaveBeenCalledWith(first, expect.any(Object));
    expect(result.current.version).toBe(1);
  });

  it("drops the old district's data as soon as the district changes", async () => {
    let finishSecond;
    vi.mocked(fetchDistrictData)
      .mockImplementationOnce(async (district) => dataFor(district))
      .mockImplementationOnce((district) => new Promise((resolve) => (finishSecond = () => resolve(dataFor(district)))));
    const { result, rerender } = renderHook(({ district }) => useMapData(district), { initialProps: { district: first } });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.gaSites.features).toHaveLength(1);

    rerender({ district: second });
    expect(result.current.status).toBe('loading');
    expect(result.current.abandoned).toBeNull();
    expect(result.current.gaSites).toBeNull();
    expect(result.current.greenGroups).toBeNull();

    await act(async () => finishSecond());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.gaSites.features[0].properties.id).toBe('second-site');
  });

  it('reports an error, then loads again on reload', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(fetchDistrictData).mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useMapData(first));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error.message).toBe('offline');

    vi.mocked(fetchDistrictData).mockImplementation(async (district) => dataFor(district));
    act(() => result.current.reload());
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
  });

  it('gives the plots, park checks, GA sites and green groups, and no zone or grid data', async () => {
    vi.mocked(fetchDistrictData).mockImplementation(async (district) => dataFor(district));
    const { result } = renderHook(() => useMapData(first));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(Object.keys(result.current).sort()).toEqual(['abandoned', 'error', 'gaSites', 'greenGroups', 'parkChecks', 'reload', 'status', 'version']);
  });
});
