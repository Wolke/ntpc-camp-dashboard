import { describe, expect, it } from 'vitest';
import { makeCourse } from '../test/courseFactory';
import type { Course } from '../types/course';
import {
    applyCourseFilters,
    applySchoolMapFilters,
    countActiveFilterGroups,
    createDefaultFilters,
    getCourseDistrict,
    sortCourses,
} from './courseFilters';

describe('course filters', () => {
    it('selects unfinished courses by default without counting the baseline as a filter', () => {
        const now = new Date('2026-08-30T12:00:00+08:00');
        const upcoming = makeCourse({
            category: '即將開課',
            schedule: { startDate: '2026-09-05', endDate: '2026-09-06' } as Course['schedule'],
        });
        const ended = makeCourse({
            category: '已結束',
            schedule: { startDate: '2026-07-01', endDate: '2026-07-02' } as Course['schedule'],
        });
        const filters = createDefaultFilters();

        expect(filters.courseTimeStatus).toEqual(['upcoming', 'ongoing']);
        expect(applyCourseFilters([upcoming, ended], filters, now)).toEqual([upcoming]);
        expect(countActiveFilterGroups(filters)).toBe(0);
    });

    it('shows every course and counts the changed time scope when the baseline is cleared', () => {
        const courses = [makeCourse(), makeCourse({ schoolName: '另一所國民小學' })];
        const filters = createDefaultFilters();
        filters.courseTimeStatus = [];

        expect(applyCourseFilters(courses, filters)).toEqual(courses);
        expect(countActiveFilterGroups(filters)).toBe(1);
    });

    it('matches courses whose date range overlaps the selected range', () => {
        const overlapping = makeCourse({ schedule: { startDate: '2026-07-10', endDate: '2026-07-15' } as Course['schedule'] });
        const outside = makeCourse({ schedule: { startDate: '2026-08-01', endDate: '2026-08-05' } as Course['schedule'] });
        const filters = createDefaultFilters();
        filters.courseTimeStatus = [];
        filters.dateRange = { start: '2026-07-12', end: '2026-07-20' };

        expect(applyCourseFilters([overlapping, outside], filters)).toEqual([overlapping]);
    });

    it('sorts actionable registration states before closed courses', () => {
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

        expect(sortCourses([ended, ongoing, upcomingLater, upcomingSoon], 'actionable', null, now).map((course) => course.category))
            .toEqual(['稍後開課', '進行中', '已結束', '即將開課']);
    });

    it('derives districts from course text and keeps unresolved schools searchable', () => {
        expect(getCourseDistrict(makeCourse({ schoolName: '新北市板橋區文德國民小學' }))).toBe('新北市板橋區');
        expect(getCourseDistrict(makeCourse({ schoolName: '臺北市信義區測試國小' }))).toBe('臺北市信義區');
        expect(getCourseDistrict(makeCourse({ schoolName: '新北市立測試國中', address: '' }))).toBe('unknown');
    });

    it('updates map courses with shared filters while leaving district and school navigation available', () => {
        const matching = makeCourse({
            schoolName: '新北市板橋區文德國民小學',
            address: '新北市板橋區',
            eligibility: { grades: [3], allowExternalStudents: true } as Course['eligibility'],
        });
        const wrongGrade = makeCourse({
            schoolName: '新北市中和區光復國民小學',
            address: '新北市中和區',
            eligibility: { grades: [4], allowExternalStudents: true } as Course['eligibility'],
        });
        const filters = createDefaultFilters();
        filters.grades = [3];
        filters.district = '新北市中和區';
        filters.schoolName = wrongGrade.schoolName;

        expect(applySchoolMapFilters([matching, wrongGrade], filters)).toEqual([matching]);
    });
});
