import type { Course, CourseTimeStatus, FilterOptions, QuotaStatus, RegistrationStatus } from '../types/course';
import { classifyTheme, getCourseSearchText, normalizeText } from './courseTaxonomy';
import { SCHOOL_COORDINATES } from './schoolCoordinates';

export type CourseSortMode =
    | 'default'
    | 'distance'
    | 'fee-asc'
    | 'fee-desc'
    | 'course-date-asc'
    | 'course-date-desc'
    | 'registration-date-asc'
    | 'registration-date-desc';

export type UserLocation = { latitude: number; longitude: number };

export const DEFAULT_FILTERS: FilterOptions = {
    searchQuery: '',
    schoolTypes: [],
    isFree: null,
    allowExternalStudents: null,
    dateRange: { start: null, end: null },
    grades: [],
    themeIds: [],
    registrationStatus: [],
    courseTimeStatus: ['upcoming'],
    quotaStatus: [],
};

export function createDefaultFilters(): FilterOptions {
    return {
        ...DEFAULT_FILTERS,
        schoolTypes: [],
        dateRange: { start: null, end: null },
        grades: [],
        themeIds: [],
        registrationStatus: [],
        courseTimeStatus: [...DEFAULT_FILTERS.courseTimeStatus],
        quotaStatus: [],
    };
}

function parseCourseDate(value: string, endOfDay = false): Date {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00'}`);
    }
    return new Date(value);
}

export function getCourseStatus(course: Course, now: Date): {
    registration: RegistrationStatus;
    courseTime: CourseTimeStatus;
    quota: QuotaStatus;
} {
    const regEnd = new Date(course.registration.endTime);
    const regStart = new Date(course.registration.startTime);
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    let registration: RegistrationStatus = 'closed';
    if (now < regStart) registration = 'not_started';
    else if (now > regEnd) registration = 'closed';
    else if (regEnd < threeDaysLater) registration = 'closing_soon';
    else registration = 'available';

    const courseStart = parseCourseDate(course.schedule.startDate);
    const courseEnd = parseCourseDate(course.schedule.endDate, true);
    let courseTime: CourseTimeStatus = 'ended';
    if (now < courseStart) courseTime = 'upcoming';
    else if (now <= courseEnd) courseTime = 'ongoing';

    const { enrolled, planned, actual } = course.quota;
    let quota: QuotaStatus = 'available';
    if (actual >= planned && planned > 0) quota = 'full';
    else if (planned > 0 && planned - actual <= 3) quota = 'almost_full';
    else if (registration === 'closed' && enrolled < 5 && planned > 0) quota = 'may_not_open';

    return { registration, courseTime, quota };
}

export function getSchoolType(schoolName: string | undefined): 'high_school' | 'junior_high' | 'elementary' {
    if (!schoolName) return 'high_school';
    if (schoolName.includes('國民中小學') || schoolName.includes('國中小')) return 'junior_high';
    if (schoolName.includes('國民小學') || schoolName.includes('國小')) return 'elementary';
    if (schoolName.includes('國民中學') || schoolName.includes('國中')) return 'junior_high';
    return 'high_school';
}

export function applyCourseFilters(
    courses: Course[],
    filters: FilterOptions,
    selectedSchool: string | null = null,
    now = new Date(),
): Course[] {
    return courses.filter((course) => {
        if (filters.searchQuery) {
            const query = normalizeText(filters.searchQuery);
            if (!normalizeText(getCourseSearchText(course)).includes(query)) return false;
        }
        if (filters.themeIds.length > 0 && !filters.themeIds.includes(classifyTheme(course).id)) return false;
        if (selectedSchool && course.schoolName !== selectedSchool) return false;
        if (filters.schoolTypes.length > 0 && !filters.schoolTypes.includes(getSchoolType(course.schoolName))) return false;
        if (filters.isFree !== null && filters.isFree !== course.fee.isFree) return false;
        if (filters.grades.length > 0 && !filters.grades.every((grade) => course.eligibility.grades.includes(grade))) return false;
        if (filters.allowExternalStudents !== null && filters.allowExternalStudents !== course.eligibility.allowExternalStudents) return false;

        const courseStart = course.schedule.startDate;
        const courseEnd = course.schedule.endDate;
        if (filters.dateRange.start && courseEnd && courseEnd < filters.dateRange.start) return false;
        if (filters.dateRange.end && courseStart && courseStart > filters.dateRange.end) return false;

        const status = getCourseStatus(course, now);
        if (filters.registrationStatus.length > 0 && !filters.registrationStatus.includes(status.registration)) return false;
        if (filters.courseTimeStatus.length > 0 && !filters.courseTimeStatus.includes(status.courseTime)) return false;
        if (filters.quotaStatus.length > 0 && !filters.quotaStatus.includes(status.quota)) return false;
        return true;
    });
}

function sortableFee(course: Course, direction: 'asc' | 'desc'): number {
    if (course.fee.isFree) return 0;
    if (Number.isFinite(course.fee.amount) && course.fee.amount > 0) return course.fee.amount;
    return direction === 'asc' ? Number.MAX_SAFE_INTEGER : -1;
}

function sortableDate(value: string | undefined, direction: 'asc' | 'desc'): number {
    if (!value) return direction === 'asc' ? Number.MAX_SAFE_INTEGER : -1;
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? (direction === 'asc' ? Number.MAX_SAFE_INTEGER : -1) : time;
}

function distanceKm(from: UserLocation, to: [number, number]): number {
    const radians = (value: number) => value * Math.PI / 180;
    const latDelta = radians(to[0] - from.latitude);
    const lngDelta = radians(to[1] - from.longitude);
    const fromLat = radians(from.latitude);
    const toLat = radians(to[0]);
    const a = Math.sin(latDelta / 2) ** 2 + Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lngDelta / 2) ** 2;
    return 2 * 6371 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function registrationRank(course: Course, now: Date): number {
    const status = getCourseStatus(course, now);
    if (status.registration === 'closing_soon') return 0;
    if (status.registration === 'available') return 1;
    if (status.registration === 'not_started') return 2;
    return 3;
}

function courseTimeRank(course: Course, now: Date): number {
    const status = getCourseStatus(course, now);
    if (status.courseTime === 'upcoming') return 0;
    if (status.courseTime === 'ongoing') return 1;
    return 2;
}

function stableCourseCompare(a: Course, b: Course): number {
    return a.schoolName.localeCompare(b.schoolName, 'zh-TW') ||
        (a.category || a.courseName).localeCompare(b.category || b.courseName, 'zh-TW');
}

export function sortCourses(
    courses: Course[],
    mode: CourseSortMode,
    userLocation: UserLocation | null = null,
    now = new Date(),
): Course[] {
    const next = [...courses];
    if (mode === 'fee-asc') return next.sort((a, b) => sortableFee(a, 'asc') - sortableFee(b, 'asc') || stableCourseCompare(a, b));
    if (mode === 'fee-desc') return next.sort((a, b) => sortableFee(b, 'desc') - sortableFee(a, 'desc') || stableCourseCompare(a, b));
    if (mode === 'distance' && userLocation) {
        return next.sort((a, b) => {
            const aCoords = SCHOOL_COORDINATES[a.schoolName];
            const bCoords = SCHOOL_COORDINATES[b.schoolName];
            const aDistance = aCoords ? distanceKm(userLocation, aCoords) : Number.MAX_SAFE_INTEGER;
            const bDistance = bCoords ? distanceKm(userLocation, bCoords) : Number.MAX_SAFE_INTEGER;
            return aDistance - bDistance || stableCourseCompare(a, b);
        });
    }
    if (mode === 'course-date-asc') return next.sort((a, b) => sortableDate(a.schedule.startDate, 'asc') - sortableDate(b.schedule.startDate, 'asc') || stableCourseCompare(a, b));
    if (mode === 'course-date-desc') return next.sort((a, b) => sortableDate(b.schedule.startDate, 'desc') - sortableDate(a.schedule.startDate, 'desc') || stableCourseCompare(a, b));
    if (mode === 'registration-date-asc') return next.sort((a, b) => sortableDate(a.registration.startTime, 'asc') - sortableDate(b.registration.startTime, 'asc') || stableCourseCompare(a, b));
    if (mode === 'registration-date-desc') return next.sort((a, b) => sortableDate(b.registration.startTime, 'desc') - sortableDate(a.registration.startTime, 'desc') || stableCourseCompare(a, b));
    return next.sort((a, b) =>
        courseTimeRank(a, now) - courseTimeRank(b, now)
        || sortableDate(a.schedule.startDate, 'asc') - sortableDate(b.schedule.startDate, 'asc')
        || registrationRank(a, now) - registrationRank(b, now)
        || stableCourseCompare(a, b));
}

export function countActiveFilterGroups(filters: FilterOptions): number {
    return [
        Boolean(filters.searchQuery.trim()),
        filters.schoolTypes.length > 0,
        filters.isFree !== null,
        filters.allowExternalStudents !== null,
        Boolean(filters.dateRange.start || filters.dateRange.end),
        filters.grades.length > 0,
        filters.themeIds.length > 0,
        filters.registrationStatus.length > 0,
        filters.courseTimeStatus.length > 0,
        filters.quotaStatus.length > 0,
    ].filter(Boolean).length;
}

export function getCourseKey(course: Course): string {
    const source = course.source;
    return [source?.type, source?.schoolId, source?.actId, source?.courseId, course.schoolName, course.category || course.courseName, course.schedule.startDate, course.schedule.startTime]
        .filter(Boolean)
        .join('|');
}
