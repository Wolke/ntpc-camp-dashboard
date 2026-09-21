import type { FilterOptions } from '../types/course';
import { createDefaultFilters, UNKNOWN_DISTRICT } from './courseFilters';
import { COURSE_WEEKDAYS } from './courseSchedule';
import { getThemeById, THEME_RULES } from './courseTaxonomy';
import { formatGradeSummary, statusLabels } from './courseUtils';

export type NotificationFrequency = 'weekly' | 'daily' | 'both';

export interface NotificationPreferences {
    schemaVersion: 1;
    frequency: NotificationFrequency;
    filters: FilterOptions;
}

export const FREQUENCY_LABELS: Record<NotificationFrequency, string> = {
    weekly: '每週一課程更新摘要',
    daily: '每日開放報名提醒',
    both: '每週摘要＋每日報名提醒',
};

function object(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_preferences');
    return value as Record<string, unknown>;
}

function text(value: unknown, max = 200): string {
    if (value === undefined || value === null) return '';
    if (typeof value !== 'string' || value.length > max) throw new Error('invalid_filter_text');
    return value.trim();
}

function list<T extends string | number>(value: unknown, allowed: readonly T[]): T[] {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.length > 30 || value.some((item) => !allowed.includes(item))) {
        throw new Error('invalid_filter_list');
    }
    return [...new Set(value)] as T[];
}

function booleanOrNull(value: unknown): boolean | null {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'boolean') throw new Error('invalid_filter_boolean');
    return value;
}

function date(value: unknown): string | null {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('invalid_filter_date');
    const parsed = new Date(`${value}T00:00:00Z`);
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new Error('invalid_filter_date');
    return value;
}

// Missing preferences identify the original email-only daily subscribers.
// Invalid saved conditions are rejected, never silently widened to all courses.
export function normalizeNotificationPreferences(input?: unknown): NotificationPreferences {
    const defaults = createDefaultFilters();
    if (input === undefined) return { schemaVersion: 1, frequency: 'daily', filters: { ...defaults, courseTimeStatus: [] } };
    const preferences = object(input);
    if (preferences.schemaVersion !== undefined && preferences.schemaVersion !== 1) throw new Error('unsupported_preferences_version');
    const frequency = preferences.frequency;
    if (frequency !== 'weekly' && frequency !== 'daily' && frequency !== 'both') throw new Error('invalid_frequency');
    const filters = preferences.filters === undefined ? {} : object(preferences.filters);
    if (Object.keys(filters).some((key) => !Object.prototype.hasOwnProperty.call(defaults, key))) throw new Error('unsupported_filter');
    const range = filters.dateRange === undefined ? {} : object(filters.dateRange);
    if (Object.keys(range).some((key) => !['start', 'end'].includes(key))) throw new Error('unsupported_date_filter');
    const themeIds = list(filters.themeIds, [...THEME_RULES.map((theme) => theme.id), 'other']);
    const dateRange = { start: date(range.start), end: date(range.end) };
    if (dateRange.start && dateRange.end && dateRange.start > dateRange.end) throw new Error('invalid_date_range');
    return {
        schemaVersion: 1,
        frequency,
        filters: {
            ...defaults,
            searchQuery: text(filters.searchQuery),
            district: text(filters.district) || null,
            schoolName: text(filters.schoolName) || null,
            grades: list(filters.grades, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
            weekdays: list(filters.weekdays, COURSE_WEEKDAYS),
            schoolTypes: list(filters.schoolTypes, ['elementary', 'junior_high', 'high_school'] as const),
            isFree: booleanOrNull(filters.isFree),
            allowExternalStudents: booleanOrNull(filters.allowExternalStudents),
            dateRange,
            themeIds,
            registrationStatus: list(filters.registrationStatus, ['available', 'closing_soon', 'closed', 'not_started'] as const),
            courseTimeStatus: filters.courseTimeStatus === undefined ? defaults.courseTimeStatus : list(filters.courseTimeStatus, ['upcoming', 'ongoing', 'ended'] as const),
            quotaStatus: list(filters.quotaStatus, ['available', 'almost_full', 'full', 'may_not_open'] as const),
        },
    };
}

export function describeNotificationFilters(filters: FilterOptions): string[] {
    const labels: string[] = [];
    if (filters.searchQuery) labels.push(`關鍵字：${filters.searchQuery}`);
    if (filters.district) labels.push(filters.district === UNKNOWN_DISTRICT ? '未標示行政區' : filters.district);
    if (filters.schoolName) labels.push(`學校：${filters.schoolName}`);
    if (filters.grades.length) {
        const highSchoolGrades: Record<number, string> = { 10: '高一', 11: '高二', 12: '高三' };
        const grades = [
            filters.grades.some((grade) => grade <= 9) ? formatGradeSummary(filters.grades) : '',
            ...filters.grades.filter((grade) => grade >= 10).map((grade) => highSchoolGrades[grade]),
        ].filter(Boolean).join('、');
        labels.push(`年級：${grades}${filters.grades.length > 1 ? '（須全部符合）' : ''}`);
    }
    if (filters.weekdays.length) labels.push(`上課星期：${filters.weekdays.join('、')}`);
    if (filters.allowExternalStudents !== null) labels.push(filters.allowExternalStudents ? '開放外校' : '限本校');
    if (filters.isFree !== null) labels.push(filters.isFree ? '免費' : '付費');
    const schoolTypes = { elementary: '國小', junior_high: '國中', high_school: '高中職' };
    if (filters.schoolTypes.length) labels.push(filters.schoolTypes.map((value) => schoolTypes[value]).join('、'));
    if (filters.themeIds.length) labels.push(filters.themeIds.map((value) => getThemeById(value)!.label).join('、'));
    if (filters.dateRange.start || filters.dateRange.end) labels.push(`課程日期：${filters.dateRange.start || '不限'}～${filters.dateRange.end || '不限'}`);
    if (filters.registrationStatus.length) labels.push(filters.registrationStatus.map((value) => statusLabels.registration[value]).join('、'));
    labels.push(filters.courseTimeStatus.length ? filters.courseTimeStatus.map((value) => statusLabels.courseTime[value]).join('、') : '全部課程時間');
    if (filters.quotaStatus.length) labels.push(filters.quotaStatus.map((value) => statusLabels.quota[value]).join('、'));
    return labels;
}
