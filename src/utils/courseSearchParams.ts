import type {
    CourseTimeStatus,
    FilterOptions,
    QuotaStatus,
    RegistrationStatus,
} from '../types/course';
import { getThemeById } from './courseTaxonomy';
import { createDefaultFilters, type CourseSortMode } from './courseFilters';

export interface CourseSearchState {
    filters: FilterOptions;
    sortMode: CourseSortMode;
}

const registrationStatuses: RegistrationStatus[] = ['available', 'closing_soon', 'closed', 'not_started'];
const courseTimeStatuses: CourseTimeStatus[] = ['upcoming', 'ongoing', 'ended'];
const quotaStatuses: QuotaStatus[] = ['available', 'almost_full', 'full', 'may_not_open'];
const schoolTypes: FilterOptions['schoolTypes'] = ['elementary', 'junior_high', 'high_school'];
const sortModes: CourseSortMode[] = [
    'actionable',
    'fee-asc',
    'fee-desc',
    'course-date-asc',
    'course-date-desc',
    'registration-date-asc',
    'registration-date-desc',
];

function parseList<T extends string>(value: string | null, allowed: readonly T[]): T[] {
    if (!value) return [];
    const allowedSet = new Set<string>(allowed);
    return Array.from(new Set(value.split(',').filter((item): item is T => allowedSet.has(item))));
}

function parseGrades(value: string | null): number[] {
    if (!value) return [];
    return Array.from(new Set(value.split(',').map(Number).filter((grade) => Number.isInteger(grade) && grade >= 1 && grade <= 9)))
        .sort((a, b) => a - b);
}

function isDate(value: string | null): value is string {
    return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export function parseCourseSearchParams(params: URLSearchParams): CourseSearchState {
    const filters = createDefaultFilters();
    filters.searchQuery = params.get('q')?.trim() ?? '';
    filters.district = params.get('district') || null;
    filters.schoolName = params.get('school') || null;
    filters.grades = parseGrades(params.get('grades'));
    filters.schoolTypes = parseList(params.get('types'), schoolTypes);
    filters.registrationStatus = parseList(params.get('reg'), registrationStatuses);
    filters.quotaStatus = parseList(params.get('quota'), quotaStatuses);

    const time = params.get('time');
    if (time !== null) filters.courseTimeStatus = parseList(time, courseTimeStatuses);

    const eligibility = params.get('eligibility');
    if (eligibility === 'external') filters.allowExternalStudents = true;
    if (eligibility === 'school') filters.allowExternalStudents = false;

    const fee = params.get('fee');
    if (fee === 'free') filters.isFree = true;
    if (fee === 'paid') filters.isFree = false;

    const start = params.get('start');
    const end = params.get('end');
    filters.dateRange = { start: isDate(start) ? start : null, end: isDate(end) ? end : null };

    const theme = params.get('theme');
    if (getThemeById(theme)) filters.themeIds = [theme!];

    const requestedSort = params.get('sort') as CourseSortMode | null;
    const sortMode = requestedSort && sortModes.includes(requestedSort) ? requestedSort : 'actionable';
    return { filters, sortMode };
}

function sorted(values: string[] | number[]): string {
    return [...values].sort((a, b) => String(a).localeCompare(String(b))).join(',');
}

function sameValues(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((value) => b.includes(value));
}

export function serializeCourseSearchParams({ filters, sortMode }: CourseSearchState): URLSearchParams {
    const defaults = createDefaultFilters();
    const params = new URLSearchParams();
    if (filters.searchQuery.trim()) params.set('q', filters.searchQuery.trim());
    if (filters.district) params.set('district', filters.district);
    if (filters.schoolName) params.set('school', filters.schoolName);
    if (filters.grades.length) params.set('grades', sorted(filters.grades));
    if (filters.allowExternalStudents === true) params.set('eligibility', 'external');
    if (filters.allowExternalStudents === false) params.set('eligibility', 'school');
    if (filters.isFree === true) params.set('fee', 'free');
    if (filters.isFree === false) params.set('fee', 'paid');
    if (filters.registrationStatus.length) params.set('reg', sorted(filters.registrationStatus));
    if (!sameValues(filters.courseTimeStatus, defaults.courseTimeStatus)) params.set('time', sorted(filters.courseTimeStatus));
    if (filters.quotaStatus.length) params.set('quota', sorted(filters.quotaStatus));
    if (filters.schoolTypes.length) params.set('types', sorted(filters.schoolTypes));
    if (filters.dateRange.start) params.set('start', filters.dateRange.start);
    if (filters.dateRange.end) params.set('end', filters.dateRange.end);
    if (filters.themeIds[0]) params.set('theme', filters.themeIds[0]);
    if (sortMode !== 'actionable' && sortMode !== 'distance') params.set('sort', sortMode);
    return params;
}
