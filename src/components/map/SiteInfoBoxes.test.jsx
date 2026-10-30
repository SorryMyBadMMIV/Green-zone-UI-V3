import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { GaSiteInfoBox, GreenGroupInfoBox, PatchInfoBox } from './SiteInfoBoxes.jsx';

const site = { id: 'r0_c0-1', zone: 'r0_c0', rank: 1, areaM2: 25991.5, distNearestOfficialM: 2287.7, zoneFitness: 1.4472, zoneKMax: 2 };
const siteAnalysis = {
  size: { key: 'M', radiusM: 1000 },
  nearestPark: { id: 'p', name: 'Park P', distanceM: 2287.7 },
  score: 78,
  level: { key: 'good', label: 'Good' },
  parts: { distance: 40, overlap: 8, size: 30 },
};
const group = { id: '1', kind: 'group', radiusM: 381, patchesInGroup: 34, patchesInCircle: 39, greenM2InGroup: 46489.8, greenM2InCircle: 53648.8 };

describe('GaSiteInfoBox', () => {
  it('shows the area, the score, its size class and reach, the nearest park and the candidate tag (no rank)', () => {
    render(<GaSiteInfoBox site={site} analysis={siteAnalysis} onClose={() => {}} />);
    expect(screen.getByText('Area : 25,992 m²')).toBeTruthy();
    expect(screen.getByText('Score : 78 · Good')).toBeTruthy();
    expect(screen.getByText('Size : M · reaches 1 km')).toBeTruthy();
    expect(screen.getByText('Nearest park : 2.3 km')).toBeTruthy();
    expect(screen.queryByText(/Rank/)).toBeNull();
    expect(screen.getByText('Candidate · not verified public land')).toBeTruthy();
    expect(screen.getByText('★ Recommended site (GA)')).toBeTruthy();
  });

  it('names a site the app added in a gap, and says the app picked it', () => {
    render(<GaSiteInfoBox site={{ id: 'patch-5', areaM2: 1225 }} analysis={siteAnalysis} added onClose={() => {}} />);
    expect(screen.getByText('★ Added site (app)')).toBeTruthy();
    expect(screen.getByText('Picked by the app · not verified public land')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Added site (app) patch-5' })).toBeTruthy();
  });

  it('closes from its × button', () => {
    const onClose = vi.fn();
    render(<GaSiteInfoBox site={site} analysis={siteAnalysis} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close site info' }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('PatchInfoBox', () => {
  const patch = { id: 'patch-5', areaM2: 1225, lngLat: [100.62, 13.735], pixels: 100 };
  const patchAnalysis = { ...siteAnalysis, size: { key: 'S', radiusM: 500 }, score: 79, crowded: false };

  it('shows a clicked green patch like a ★: area, score, size class and reach, nearest park', () => {
    render(<PatchInfoBox patch={patch} analysis={patchAnalysis} onClose={() => {}} />);
    expect(screen.getByRole('region', { name: 'Green patch' })).toBeTruthy();
    expect(screen.getByText('Area : 1,225 m²')).toBeTruthy();
    expect(screen.getByText('Score : 79 · Good')).toBeTruthy();
    expect(screen.getByText('Size : S · reaches 500 m')).toBeTruthy();
    expect(screen.getByText('Nearest park : 2.3 km')).toBeTruthy();
    expect(screen.getByText('Green patch · not verified public land')).toBeTruthy();
  });

  it('says when a park already serves the patch, and closes from its × button', () => {
    const onClose = vi.fn();
    render(<PatchInfoBox patch={patch} analysis={{ ...patchAnalysis, crowded: true }} onClose={onClose} />);
    expect(screen.getByText('Already served by a park')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close patch info' }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('GreenGroupInfoBox', () => {
  it('shows the green, the patches and the circle size', () => {
    render(<GreenGroupInfoBox group={group} onClose={() => {}} />);
    expect(screen.getByText('Green : 46,490 m²')).toBeTruthy();
    expect(screen.getByText('Patches : 34')).toBeTruthy();
    expect(screen.getByText('Circle : 381 m radius')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Green group 1' })).toBeTruthy();
  });

  it('names an isolated circle and closes from its × button', () => {
    const onClose = vi.fn();
    render(<GreenGroupInfoBox group={{ ...group, id: '171', kind: 'isolated' }} onClose={onClose} />);
    expect(screen.getByRole('region', { name: 'Isolated green 171' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close group info' }));
    expect(onClose).toHaveBeenCalled();
  });
});
