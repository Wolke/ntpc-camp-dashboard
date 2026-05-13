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
