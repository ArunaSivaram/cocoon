import { describe, expect, it } from 'vitest';
import { computeTargetSize } from './resizeImage';

describe('computeTargetSize', () => {
  it('shrinks a landscape photo so the longest edge hits maxEdge', () => {
    expect(computeTargetSize(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
  });

  it('shrinks a portrait photo so the longest edge hits maxEdge', () => {
    expect(computeTargetSize(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it('shrinks a square photo to maxEdge × maxEdge', () => {
    expect(computeTargetSize(3200, 3200, 1600)).toEqual({ width: 1600, height: 1600 });
  });

  it('leaves a photo already smaller than maxEdge unchanged', () => {
    expect(computeTargetSize(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });

  it('leaves a photo exactly at maxEdge unchanged', () => {
    expect(computeTargetSize(1600, 900, 1600)).toEqual({ width: 1600, height: 900 });
  });

  it('rounds dimensions to whole pixels', () => {
    // 1333 / 2000 * 1600 = 1066.4 → 1066
    expect(computeTargetSize(2000, 1333, 1600)).toEqual({ width: 1600, height: 1066 });
  });

  it('never returns zero for extremely thin images', () => {
    const size = computeTargetSize(10000, 1, 1600);
    expect(size.width).toBe(1600);
    expect(size.height).toBeGreaterThanOrEqual(1);
  });

  it('throws on invalid source dimensions', () => {
    expect(() => computeTargetSize(0, 100, 1600)).toThrow();
    expect(() => computeTargetSize(100, -5, 1600)).toThrow();
    expect(() => computeTargetSize(Number.NaN, 100, 1600)).toThrow();
  });

  it('throws on invalid maxEdge', () => {
    expect(() => computeTargetSize(100, 100, 0)).toThrow();
    expect(() => computeTargetSize(100, 100, -1)).toThrow();
  });
});
