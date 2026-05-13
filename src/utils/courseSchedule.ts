import type { Course } from '../types/course';

const monthLabels = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
const weekLabels = ['第一週', '第二週', '第三週', '第四週', '第五週', '第六週'];

function parseDate(dateStr: string): Date | null {
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;

    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (Number.isNaN(date.getTime())) return null;
    return date;
}

function getMonday(date: Date): Date {
    const monday = new Date(date);
    const day = monday.getDay();
    const dayOffset = day === 0 ? -6 : 1 - day;
    monday.setDate(monday.getDate() + dayOffset);
    monday.setHours(0, 0, 0, 0);
    return monday;
}

function addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

function toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export interface CourseWeekInfo {
    label: string;
    startDate: string;
    endDate: string;
}

export function getCourseWeekInfo(dateStr: string): CourseWeekInfo | null {
    const startDate = parseDate(dateStr);
    if (!startDate) return null;

    const monthStart = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const firstWeekMonday = getMonday(monthStart);
    const courseWeekMonday = getMonday(startDate);
    const weekIndex = Math.floor((courseWeekMonday.getTime() - firstWeekMonday.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const monthLabel = monthLabels[startDate.getMonth()];
    const weekLabel = weekLabels[weekIndex] ?? `第${weekIndex + 1}週`;

    return {
        label: `${monthLabel}${weekLabel}`,
        startDate: toDateKey(courseWeekMonday),
        endDate: toDateKey(addDays(courseWeekMonday, 6)),
    };
}

export function formatCourseWeekSummary(course: Course): string {
    return getCourseWeekInfo(course.schedule.startDate)?.label ?? '';
}

export function getCourseDayCount(course: Course): number | null {
    const start = parseDate(course.schedule.startDate);
    const end = parseDate(course.schedule.endDate);
    if (!start || !end || end < start) return null;

    return Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
}

export function getCourseDurationLabel(dayCount: number): string {
    if (dayCount === 1) return '一天營隊';
    if (dayCount === 2) return '兩天營隊';
    return `${dayCount} 天營隊`;
}

export function getWeekInfosInRange(startDate: string, endDate: string): CourseWeekInfo[] {
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    if (!start || !end || start > end) return [];

    const rows: CourseWeekInfo[] = [];
    const seen = new Set<string>();
    let current = new Date(start);

    while (current <= end) {
        const info = getCourseWeekInfo(toDateKey(current));
        if (info && !seen.has(info.label)) {
            seen.add(info.label);
            rows.push(info);
        }
        current = addDays(current, 1);
    }

    return rows;
}
