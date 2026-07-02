import { describe, it, expect } from 'vitest';
import { getRouteColor, getRouteHighlightColor } from './getRouteColor';

describe('getRouteColor', () => {
    it('returns an hsl() string', () => {
        expect(getRouteColor(0)).toMatch(/^hsl\(\d+(\.\d+)?, 70%, 45%\)$/);
    });

    it('is deterministic for the same index', () => {
        expect(getRouteColor(5)).toBe(getRouteColor(5));
    });

    it('assigns different hues to different indices', () => {
        expect(getRouteColor(0)).not.toBe(getRouteColor(1));
    });

    it('wraps the hue into the valid 0-360 range', () => {
        for (const index of [0, 1, 10, 50, 137]) {
            const hue = Number(getRouteColor(index).match(/hsl\((\d+(\.\d+)?),/)[1]);
            expect(hue).toBeGreaterThanOrEqual(0);
            expect(hue).toBeLessThan(360);
        }
    });
});

describe('getRouteHighlightColor', () => {
    it('uses the same hue as getRouteColor but higher saturation/lightness', () => {
        const base = getRouteColor(3);
        const highlight = getRouteHighlightColor(3);
        const baseHue = base.match(/hsl\((\d+(\.\d+)?),/)[1];
        const highlightHue = highlight.match(/hsl\((\d+(\.\d+)?),/)[1];
        expect(highlightHue).toBe(baseHue);
        expect(highlight).toMatch(/^hsl\(\d+(\.\d+)?, 90%, 60%\)$/);
    });
});
