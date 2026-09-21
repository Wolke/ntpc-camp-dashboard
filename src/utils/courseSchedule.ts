import type { Course, CourseWeekday } from '../types/course';

export const COURSE_WEEKDAYS: readonly CourseWeekday[] = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];

const monthLabels = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
const weekLabels = ['第一週', '第二週', '第三週', '第四週', '第五週', '第六週'];

function parseDate(dateStr: string): Date | null {
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;

    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (Number.isNaN(date.getTime())
        || date.getFullYear() !== Number(match[1])
        || date.getMonth() !== Number(match[2]) - 1
        || date.getDate() !== Number(match[3])) return null;
    return date;
}

export function getCourseWeekdays(course: Course): CourseWeekday[] {
    // The raw schedule contains every meeting day; schedule.weekday may only contain the first.
    const explicitDays = course._raw?.schedule?.match(/週[一二三四五六日]/g)
        ?? course.schedule.weekday.match(/週[一二三四五六日]/g);
    if (explicitDays?.length) return COURSE_WEEKDAYS.filter((weekday) => explicitDays.includes(weekday));

    const start = parseDate(course.schedule.startDate);
    const end = parseDate(course.schedule.endDate);
    if (!start || !end || start > end) return [];

    const weekdays = new Set<CourseWeekday>();
    const current = new Date(start);
    for (let day = 0; current <= end && day < 7; day += 1) {
        weekdays.add(COURSE_WEEKDAYS[(current.getDay() + 6) % 7]);
        current.setDate(current.getDate() + 1);
    }
    return COURSE_WEEKDAYS.filter((weekday) => weekdays.has(weekday));
}

function getMonday(date: Date): Date {
    const monday = new Date(date);
    const day = monday.getDay();
    const dayOffset = day === 0 ? -6 : 1 - day;
    monday.setDate(monday.getDate() + dayOffset);
    monday.setHours(0, 0, 0, 0);
    return monday;
}

export function formatCourseWeekSummary(course: Course): string {
    const startDate = parseDate(course.schedule.startDate);
    if (!startDate) return '';

    const monthStart = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const firstWeekMonday = getMonday(monthStart);
    const courseWeekMonday = getMonday(startDate);
    const weekIndex = Math.floor((courseWeekMonday.getTime() - firstWeekMonday.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const monthLabel = monthLabels[startDate.getMonth()];
    const weekLabel = weekLabels[weekIndex] ?? `第${weekIndex + 1}週`;

    return `${monthLabel}${weekLabel}`;
}
