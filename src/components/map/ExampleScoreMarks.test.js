import { describe, it, expect } from 'vitest';
import { exampleMarkLabel } from './ExampleScoreMarks.jsx';

describe('exampleMarkLabel', () => {
  const level = { key: 'good', label: 'Good for planting' };

  it('calls a ✓ a good example plot, never a recommendation', () => {
    expect(exampleMarkLabel({ score: 72, level })).toBe('✓ Good example plot · Good for planting · score 72');
  });
});
