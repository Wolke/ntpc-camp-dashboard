import { describe, expect, it } from 'vitest';
import { getQuickFilterPresets } from './courseQuickFilters';

describe('quick course filters', () => {
    it('creates current structured date ranges instead of search terms', () => {
        const presets = getQuickFilterPresets(new Date('2026-09-03T10:00:00+08:00'));
        expect(presets.map((preset) => preset.label)).toEqual(['本週', '下週', '未來 30 天', '開放外校', '免費', '藝術手作']);
        expect(presets[0].patch.dateRange).toEqual({ start: '2026-08-31', end: '2026-09-06' });
        expect(presets[3].patch).toEqual({ allowExternalStudents: true });
        expect(presets.every((preset) => preset.patch.searchQuery === undefined)).toBe(true);
    });
});
