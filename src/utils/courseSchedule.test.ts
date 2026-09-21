import { describe, expect, it } from 'vitest';
import { makeCourse } from '../test/courseFactory';
import type { Course } from '../types/course';
import { getCourseWeekdays } from './courseSchedule';
import { formatScheduleParts } from './courseUtils';

describe('course weekdays', () => {
    it('keeps explicit weekdays when clock times are missing', () => {
        const course = makeCourse({
            schedule: { weekday: '週一、週三', startTime: '', endTime: '' } as Course['schedule'],
        });
        expect(getCourseWeekdays(course)).toEqual(['週一', '週三']);
        expect(formatScheduleParts(course).weekdaySummary).toBe('週一、週三');
    });

    it('uses the local calendar date range only when no weekdays are specified', () => {
        const course = makeCourse({
            schedule: { startDate: '2026-09-19', endDate: '2026-09-21', weekday: '' } as Course['schedule'],
        });
        expect(getCourseWeekdays(course)).toEqual(['週一', '週六', '週日']);
    });

    it.each([
        ['', ''],
        ['2026-09-21', '2026-09-19'],
        ['2026-02-30', '2026-03-02'],
    ])('does not infer weekdays from invalid dates: %s to %s', (startDate, endDate) => {
        const course = makeCourse({ schedule: { startDate, endDate, weekday: '' } as Course['schedule'] });
        expect(getCourseWeekdays(course)).toEqual([]);
    });
});
