import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import MapOptions, { DEFAULT_OPTIONS } from './MapOptions.jsx';
import { DISTRICTS, getDistrict } from '../../data/districts.js';

const suanLuang = getDistrict('suan-luang');

const renderOptions = (props = {}) => {
  const handlers = { onDistrictChange: vi.fn(), onOptionChange: vi.fn(), onCollapsedChange: vi.fn() };
  render(<MapOptions district={suanLuang} districts={DISTRICTS} options={DEFAULT_OPTIONS} collapsed={false} {...handlers} {...props} />);
  return handlers;
};

describe('MapOptions', () => {
  it('has no district drop-down while Suan Luang is the only district', () => {
    renderOptions();
    expect(screen.queryByLabelText('District')).toBeNull();
  });

  it('shows the district drop-down again when there are more districts', () => {
    const { onDistrictChange } = renderOptions({ districts: [suanLuang, { ...suanLuang, id: 'other', nameEn: 'Other' }] });
    fireEvent.change(screen.getByLabelText('District'), { target: { value: 'other' } });
    expect(onDistrictChange).toHaveBeenCalledWith('other');
  });

  it('turns a park size class off', () => {
    const { onOptionChange } = renderOptions();
    fireEvent.click(screen.getByLabelText('S · 500 m'));
    expect(onOptionChange).toHaveBeenCalledWith('S', false);
  });

  it('turns Policy on', () => {
    const { onOptionChange } = renderOptions();
    fireEvent.click(screen.getByLabelText('Policy · 400 m'));
    expect(onOptionChange).toHaveBeenCalledWith('policy', true);
  });

  it('starts with Recommend, Green and the red abandoned land on, and the example plot score and green groups off', () => {
    const { onOptionChange } = renderOptions();
    expect(screen.getByLabelText('Recommend').checked).toBe(true);
    expect(screen.getByLabelText('Green').checked).toBe(true);
    expect(screen.getByLabelText('Abandoned land').checked).toBe(true);
    expect(screen.getByLabelText('Example plot score').checked).toBe(false);
    expect(screen.getByLabelText('Green groups').checked).toBe(false);
    expect(screen.getByLabelText('★ reach circles').checked).toBe(false);
    fireEvent.click(screen.getByLabelText('Green groups'));
    expect(onOptionChange).toHaveBeenCalledWith('greenGroups', true);
    fireEvent.click(screen.getByLabelText('★ reach circles'));
    expect(onOptionChange).toHaveBeenCalledWith('siteCircles', true);
  });

  it('explains every Show and Layers item in one line', () => {
    renderOptions();
    expect(screen.getByText("Sites the backend's genetic algorithm picked")).toBeTruthy();
    expect(screen.getByText('Shades land more than 400 m from a park')).toBeTruthy();
    expect(screen.getByText('Green the backend found in the image · zoom in to click a patch')).toBeTruthy();
    expect(screen.getByText("Draw every ★'s circle at once")).toBeTruthy();
    expect(screen.getByText("Circles around green that isn't a park")).toBeTruthy();
    expect(screen.getByText('Example plots from OpenStreetMap, not the backend')).toBeTruthy();
    expect(screen.getByText('✓ on red plots outside 400 m that score 60 or more')).toBeTruthy();
  });

  it('has no heat map or grid switches', () => {
    renderOptions();
    for (const label of ['Heat map', 'Green/grey grid']) {
      expect(screen.queryByLabelText(label)).toBeNull();
    }
  });

  it('marks Recommend with a ★ and Policy with a dashed ring, not with colour squares like the park circles', () => {
    renderOptions();
    expect(screen.getByTestId('swatch-recommend').textContent).toBe('★');
    expect(screen.getByTestId('swatch-policy').style.borderStyle).toBe('dashed');
    expect(screen.getByTestId('swatch-example').textContent).toBe('✓');
  });

  it('switches the base map to the street map', () => {
    const { onOptionChange } = renderOptions();
    fireEvent.change(screen.getByLabelText('Base map'), { target: { value: 'street' } });
    expect(onOptionChange).toHaveBeenCalledWith('basemap', 'street');
  });

  it('minimizes from the – button', () => {
    const { onCollapsedChange } = renderOptions();
    fireEvent.click(screen.getByRole('button', { name: 'Minimize map options' }));
    expect(onCollapsedChange).toHaveBeenCalledWith(true);
  });

  it('shows only a pill with the district when minimized, and opens again from it', () => {
    const { onCollapsedChange } = renderOptions({ collapsed: true });
    expect(screen.queryByLabelText('Recommend')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '⚙ Map options · Suan Luang' }));
    expect(onCollapsedChange).toHaveBeenCalledWith(false);
  });
});
