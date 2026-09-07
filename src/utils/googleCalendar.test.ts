import { describe, expect, it } from 'vitest';
import { makeCourse } from '../test/courseFactory';
import { buildRegistrationReminderCalendarUrl } from './googleCalendar';

describe('registration reminders', () => {
    it('only creates a reminder before registration starts', () => {
        const course = makeCourse({ registration: { startTime: '2026-09-05T09:00:00+08:00' } as ReturnType<typeof makeCourse>['registration'] });
        expect(buildRegistrationReminderCalendarUrl(course, new Date('2026-09-03T09:00:00+08:00'))).toContain('calendar.google.com');
        expect(buildRegistrationReminderCalendarUrl(course, new Date('2026-09-06T09:00:00+08:00'))).toBeNull();
    });
});
