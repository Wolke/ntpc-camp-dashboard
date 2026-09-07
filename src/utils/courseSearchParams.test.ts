import { describe, expect, it } from 'vitest';
import { createDefaultFilters } from './courseFilters';
import { parseCourseSearchParams, serializeCourseSearchParams } from './courseSearchParams';

describe('course search URL state', () => {
    it('round-trips non-default filters and sorting', () => {
        const filters = createDefaultFilters();
        Object.assign(filters, {
            searchQuery: '籃球',
            district: '新北市三重區',
            schoolName: '新北市三重區五華國民小學',
            grades: [4, 3],
            allowExternalStudents: true,
            isFree: true,
            registrationStatus: ['available'],
            courseTimeStatus: ['upcoming'],
            schoolTypes: ['elementary'],
            themeIds: ['arts-craft'],
        });
        const params = serializeCourseSearchParams({ filters, sortMode: 'fee-asc' });
        const parsed = parseCourseSearchParams(params);
        expect(parsed).toEqual({
            filters: { ...filters, grades: [3, 4] },
            sortMode: 'fee-asc',
        });
    });

    it('omits defaults and ignores invalid or private distance state', () => {
        expect(serializeCourseSearchParams({ filters: createDefaultFilters(), sortMode: 'actionable' }).toString()).toBe('');
        const parsed = parseCourseSearchParams(new URLSearchParams('grades=0,3,20&reg=bad&sort=distance&theme=missing'));
        expect(parsed.filters.grades).toEqual([3]);
        expect(parsed.filters.registrationStatus).toEqual([]);
        expect(parsed.filters.themeIds).toEqual([]);
        expect(parsed.sortMode).toBe('actionable');
    });
});
