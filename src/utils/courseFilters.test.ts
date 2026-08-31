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

    it('sorts upcoming courses by their nearest start date before ongoing and ended courses', () => {
        const now = new Date('2026-08-30T12:00:00+08:00');
        const upcomingSoon = makeCourse({
            category: '即將開課',
            schedule: { startDate: '2026-09-05', endDate: '2026-09-06' } as Course['schedule'],
            registration: { endTime: '2026-08-20T09:00:00+08:00' } as Course['registration'],
        });
        const upcomingLater = makeCourse({
            category: '稍後開課',
            schedule: { startDate: '2026-09-10', endDate: '2026-09-12' } as Course['schedule'],
            registration: { endTime: '2026-09-01T12:00:00+08:00' } as Course['registration'],
        });
        const ongoing = makeCourse({
            category: '進行中',
            schedule: { startDate: '2026-08-20', endDate: '2026-09-02' } as Course['schedule'],
        });
        const ended = makeCourse({
            category: '已結束',
            schedule: { startDate: '2026-07-01', endDate: '2026-07-02' } as Course['schedule'],
            registration: { endTime: '2026-06-20T09:00:00+08:00' } as Course['registration'],
        });

        expect(sortCourses([ended, ongoing, upcomingLater, upcomingSoon], 'default', null, now).map((course) => course.category))
            .toEqual(['即將開課', '稍後開課', '進行中', '已結束']);
    });
});
