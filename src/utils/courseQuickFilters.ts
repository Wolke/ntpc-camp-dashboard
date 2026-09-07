import type { FilterOptions } from '../types/course';

export interface QuickFilterPreset {
    id: string;
    label: string;
    patch: Partial<FilterOptions>;
}

function formatDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

function startOfWeek(date: Date): Date {
    const start = new Date(date);
    const day = start.getDay();
    start.setDate(start.getDate() + (day === 0 ? -6 : 1 - day));
    start.setHours(0, 0, 0, 0);
    return start;
}

export function getQuickFilterPresets(now = new Date()): QuickFilterPreset[] {
    const thisWeekStart = startOfWeek(now);
    const nextWeekStart = addDays(thisWeekStart, 7);
    return [
        {
            id: 'this-week',
            label: '本週',
            patch: { dateRange: { start: formatDateInputValue(thisWeekStart), end: formatDateInputValue(addDays(thisWeekStart, 6)) } },
        },
        {
            id: 'next-week',
            label: '下週',
            patch: { dateRange: { start: formatDateInputValue(nextWeekStart), end: formatDateInputValue(addDays(nextWeekStart, 6)) } },
        },
        {
            id: 'next-30-days',
            label: '未來 30 天',
            patch: { dateRange: { start: formatDateInputValue(now), end: formatDateInputValue(addDays(now, 30)) } },
        },
        { id: 'external', label: '開放外校', patch: { allowExternalStudents: true } },
        { id: 'free', label: '免費', patch: { isFree: true } },
        { id: 'arts', label: '藝術手作', patch: { themeIds: ['arts-craft'] } },
    ];
}
