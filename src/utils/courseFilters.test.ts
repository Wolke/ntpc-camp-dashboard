import { describe, expect, it } from 'vitest';
import { makeCourse } from '../test/courseFactory';
import type { Course } from '../types/course';
import {
    applyCourseFilters,
    countActiveFilterGroups,
    createDefaultFilters,
    sortCourses,
} from './courseFilters';

describe('course filters', () => {
    it('shows every course when filters are neutral', () => {
        const courses = [makeCourse(), makeCourse({ schoolName: '另一所國民小學' })];
        expect(applyCourseFilters(courses, createDefaultFilters())).toEqual(courses);
        expect(countActiveFilterGroups(createDefaultFilters())).toBe(0);
    });

    it('matches courses whose date range overlaps the selected range', () => {
        const overlapping = makeCourse({ schedule: { startDate: '2026-07-10', endDate: '2026-07-15' } as Course['schedule'] });
        const outside = makeCourse({ schedule: { startDate: '2026-08-01', endDate: '2026-08-05' } as Course['schedule'] });
        const filters = createDefaultFilters();
        filters.dateRange = { start: '2026-07-12', end: '2026-07-20' };

        expect(applyCourseFilters([overlapping, outside], filters)).toEqual([overlapping]);
    });

    it('sorts actionable registration states before ended courses', () => {
        const now = new Date('2026-08-30T12:00:00+08:00');
        const closing = makeCourse({ category: '即將截止', registration: { endTime: '2026-09-01T12:00:00+08:00' } as Course['registration'] });
        const available = makeCourse({ category: '可報名' });
        const notStarted = makeCourse({ category: '尚未開放', registration: { startTime: '2026-09-05T09:00:00+08:00' } as Course['registration'] });
        const closed = makeCourse({ category: '已截止', registration: { endTime: '2026-08-20T09:00:00+08:00' } as Course['registration'] });
        const ended = makeCourse({
            category: '已結束',
            schedule: { startDate: '2026-07-01', endDate: '2026-07-02' } as Course['schedule'],
            registration: { endTime: '2026-06-20T09:00:00+08:00' } as Course['registration'],
        });

        expect(sortCourses([ended, closed, notStarted, available, closing], 'default', null, now).map((course) => course.category))
            .toEqual(['即將截止', '可報名', '尚未開放', '已截止', '已結束']);
    });
});
