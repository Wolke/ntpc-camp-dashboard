import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import CourseList from '../components/courses/CourseList';
import CourseSortControl, { type CourseSortMode } from '../components/courses/CourseSortControl';
import DateRangeFilter from '../components/courses/DateRangeFilter';
import EligibilityFilter from '../components/courses/EligibilityFilter';
import GradeFilter from '../components/courses/GradeFilter';
import SchoolMap from '../components/courses/SchoolMap';
import SearchBar from '../components/courses/SearchBar';
import StatusFilter from '../components/courses/StatusFilter';
import SubscribePanel from '../components/SubscribePanel';
import { useCourses } from '../hooks/useCourses';
import { useCourseStore } from '../store/courseStore';
import type { Course } from '../types/course';
import { getCourseDurationLabel } from '../utils/courseSchedule';
import { getThemeById } from '../utils/courseTaxonomy';
import { SCHOOL_COORDINATES } from '../utils/schoolCoordinates';

type UserLocation = { latitude: number; longitude: number };
type LocationStatus = 'idle' | 'requesting' | 'ready' | 'error' | 'unsupported';

function getSortableFee(course: Course, direction: 'asc' | 'desc'): number {
    if (course.fee.isFree) return 0;
    if (Number.isFinite(course.fee.amount) && course.fee.amount > 0) return course.fee.amount;
    return direction === 'asc' ? Number.MAX_SAFE_INTEGER : -1;
}

function getSortableDate(dateValue: string | undefined, direction: 'asc' | 'desc'): number {
    if (!dateValue) return direction === 'asc' ? Number.MAX_SAFE_INTEGER : -1;

    const time = new Date(dateValue).getTime();
    if (Number.isNaN(time)) return direction === 'asc' ? Number.MAX_SAFE_INTEGER : -1;
    return time;
}

function getDistanceKm(from: UserLocation, to: [number, number]): number {
    const earthRadiusKm = 6371;
    const toRadians = (value: number) => value * Math.PI / 180;
    const latDelta = toRadians(to[0] - from.latitude);
    const lngDelta = toRadians(to[1] - from.longitude);
    const fromLat = toRadians(from.latitude);
    const toLat = toRadians(to[0]);
    const a =
        Math.sin(latDelta / 2) ** 2 +
        Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lngDelta / 2) ** 2;

    return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function CourseDashboard() {
    const { courses, allCourses, stats, lastUpdated, isLoading, error } = useCourses();
    const { filters, selectedSchool, setSelectedSchool, setFilters, resetFilters } = useCourseStore();
    const [searchParams, setSearchParams] = useSearchParams();
    const [sortMode, setSortMode] = useState<CourseSortMode>('default');
    const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
    const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
    const themeId = searchParams.get('theme');
    const durationParam = searchParams.get('duration');
    const weekParam = searchParams.get('week');
    const selectedTheme = getThemeById(themeId);
    const selectedDurationDay = durationParam === '1' || durationParam === '2' ? Number(durationParam) : null;
    const selectedDurationLabel = selectedDurationDay ? getCourseDurationLabel(selectedDurationDay) : null;
    const selectedWeekSummary = weekParam || null;

    useEffect(() => {
        if (themeId && !selectedTheme) {
            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete('theme');
            setSearchParams(nextParams, { replace: true });
            resetFilters();
            return;
        }

        if (!selectedTheme) {
            if (filters.themeIds.length > 0) {
                setFilters({
                    themeIds: [],
                    registrationStatus: ['available', 'closing_soon', 'not_started'],
                    courseTimeStatus: ['upcoming', 'ongoing'],
                    quotaStatus: ['available', 'almost_full', 'may_not_open'],
                });
            }
            return;
        }

        const themeAlreadyApplied = filters.themeIds.length === 1 && filters.themeIds[0] === selectedTheme.id;
        const statusFiltersCleared =
            filters.registrationStatus.length === 0 &&
            filters.courseTimeStatus.length === 0 &&
            filters.quotaStatus.length === 0;

        if (!themeAlreadyApplied || !statusFiltersCleared) {
            setFilters({
                themeIds: [selectedTheme.id],
                registrationStatus: [],
                courseTimeStatus: [],
                quotaStatus: [],
            });
        }
    }, [
        filters.courseTimeStatus.length,
        filters.quotaStatus.length,
        filters.registrationStatus.length,
        filters.themeIds,
        resetFilters,
        searchParams,
        selectedTheme,
        setFilters,
        setSearchParams,
        themeId,
    ]);

    useEffect(() => {
        if (durationParam && !selectedDurationDay) {
            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete('duration');
            setSearchParams(nextParams, { replace: true });
            if (filters.durationDays.length > 0) {
                setFilters({ durationDays: [] });
            }
            return;
        }

        if (!selectedDurationDay) {
            if (filters.durationDays.length > 0) {
                setFilters({ durationDays: [] });
            }
            return;
        }

        const durationAlreadyApplied =
            filters.durationDays.length === 1 &&
            filters.durationDays[0] === selectedDurationDay;
        const statusFiltersCleared =
            filters.registrationStatus.length === 0 &&
            filters.courseTimeStatus.length === 0 &&
            filters.quotaStatus.length === 0;

        if (!durationAlreadyApplied || !statusFiltersCleared) {
            setFilters({
                durationDays: [selectedDurationDay],
                allowExternalStudents: null,
                registrationStatus: [],
                courseTimeStatus: [],
                quotaStatus: [],
            });
        }
    }, [
        durationParam,
        filters.courseTimeStatus.length,
        filters.durationDays,
        filters.quotaStatus.length,
        filters.registrationStatus.length,
        searchParams,
        selectedDurationDay,
        setFilters,
        setSearchParams,
    ]);

    useEffect(() => {
        if (!selectedWeekSummary) {
            if (filters.weekSummaries.length > 0) {
                setFilters({ weekSummaries: [] });
            }
            return;
        }

        const weekAlreadyApplied =
            filters.weekSummaries.length === 1 &&
            filters.weekSummaries[0] === selectedWeekSummary;
        const statusFiltersCleared =
            filters.registrationStatus.length === 0 &&
            filters.courseTimeStatus.length === 0 &&
            filters.quotaStatus.length === 0;

        if (!weekAlreadyApplied || !statusFiltersCleared) {
            setFilters({
                weekSummaries: [selectedWeekSummary],
                allowExternalStudents: null,
                registrationStatus: [],
                courseTimeStatus: [],
                quotaStatus: [],
            });
        }
    }, [
        filters.courseTimeStatus.length,
        filters.quotaStatus.length,
        filters.registrationStatus.length,
        filters.weekSummaries,
        selectedWeekSummary,
        setFilters,
    ]);

    const clearThemeFilter = () => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('theme');
        setSearchParams(nextParams, { replace: true });
        resetFilters();
    };

    const clearDurationFilter = () => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('duration');
        setSearchParams(nextParams, { replace: true });
        resetFilters();
    };

    const clearWeekFilter = () => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('week');
        setSearchParams(nextParams, { replace: true });
        resetFilters();
    };

    const updatedDate = lastUpdated
        ? new Date(lastUpdated).toLocaleDateString('zh-TW', { year: 'numeric', month: 'numeric', day: 'numeric' })
        : null;

    const requestLocation = () => {
        if (!navigator.geolocation) {
            setLocationStatus('unsupported');
            return;
        }

        setLocationStatus('requesting');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
                setLocationStatus('ready');
            },
            () => {
                setLocationStatus('error');
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 1000 * 60 * 10 },
        );
    };

    const sortedCourses = useMemo(() => {
        const nextCourses = [...courses];

        if (sortMode === 'fee-asc') {
            return nextCourses.sort((a, b) =>
                getSortableFee(a, 'asc') - getSortableFee(b, 'asc') ||
                a.schoolName.localeCompare(b.schoolName, 'zh-TW')
            );
        }

        if (sortMode === 'fee-desc') {
            return nextCourses.sort((a, b) =>
                getSortableFee(b, 'desc') - getSortableFee(a, 'desc') ||
                a.schoolName.localeCompare(b.schoolName, 'zh-TW')
            );
        }

        if (sortMode === 'distance' && userLocation) {
            return nextCourses.sort((a, b) => {
                const aCoords = SCHOOL_COORDINATES[a.schoolName];
                const bCoords = SCHOOL_COORDINATES[b.schoolName];
                const aDistance = aCoords ? getDistanceKm(userLocation, aCoords) : Number.MAX_SAFE_INTEGER;
                const bDistance = bCoords ? getDistanceKm(userLocation, bCoords) : Number.MAX_SAFE_INTEGER;

                return aDistance - bDistance || a.schoolName.localeCompare(b.schoolName, 'zh-TW');
            });
        }

        if (sortMode === 'course-date-asc') {
            return nextCourses.sort((a, b) =>
                getSortableDate(a.schedule.startDate, 'asc') - getSortableDate(b.schedule.startDate, 'asc') ||
                a.schoolName.localeCompare(b.schoolName, 'zh-TW')
            );
        }

        if (sortMode === 'course-date-desc') {
            return nextCourses.sort((a, b) =>
                getSortableDate(b.schedule.startDate, 'desc') - getSortableDate(a.schedule.startDate, 'desc') ||
                a.schoolName.localeCompare(b.schoolName, 'zh-TW')
            );
        }

        if (sortMode === 'registration-date-asc') {
            return nextCourses.sort((a, b) =>
                getSortableDate(a.registration.startTime, 'asc') - getSortableDate(b.registration.startTime, 'asc') ||
                a.schoolName.localeCompare(b.schoolName, 'zh-TW')
            );
        }

        if (sortMode === 'registration-date-desc') {
            return nextCourses.sort((a, b) =>
                getSortableDate(b.registration.startTime, 'desc') - getSortableDate(a.registration.startTime, 'desc') ||
                a.schoolName.localeCompare(b.schoolName, 'zh-TW')
            );
        }

        return nextCourses;
    }, [courses, sortMode, userLocation]);

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
                <section className="mb-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-sm font-medium text-indigo-600">新北市寒暑假育樂營</p>
                            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
                                課程查詢
                            </h1>
                            <p className="mt-2 text-sm text-slate-500">
                                {stats && `共 ${stats.total} 門課程，${stats.schools} 個學校/單位`}
                                {updatedDate && `，資料更新於 ${updatedDate}`}
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="rounded-md bg-slate-50 px-3 py-2">
                                <p className="text-lg font-semibold text-slate-950">{courses.length}</p>
                                <p className="text-xs text-slate-500">目前符合</p>
                            </div>
                            <div className="rounded-md bg-slate-50 px-3 py-2">
                                <p className="text-lg font-semibold text-slate-950">{stats?.allowExternalStudents ?? 0}</p>
                                <p className="text-xs text-slate-500">開放外校</p>
                            </div>
                            <div className="rounded-md bg-slate-50 px-3 py-2">
                                <p className="text-lg font-semibold text-slate-950">{stats?.free ?? 0}</p>
                                <p className="text-xs text-slate-500">免費</p>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
                    <aside className="space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-2">
                        <SearchBar />
                        <EligibilityFilter />
                        <GradeFilter />
                        <SubscribePanel />
                        <StatusFilter />
                        <DateRangeFilter courses={allCourses.length > 0 ? allCourses : courses} />

                        {selectedSchool && (
                            <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3">
                                <p className="text-sm font-medium text-indigo-900">正在篩選</p>
                                <div className="mt-2 flex items-center justify-between gap-3">
                                    <span className="text-sm text-indigo-700">{selectedSchool}</span>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedSchool(null)}
                                        className="shrink-0 rounded-md px-2 py-1 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
                                    >
                                        顯示全部
                                    </button>
                                </div>
                            </div>
                        )}

                        {selectedTheme && (
                            <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
                                <p className="text-sm font-medium text-orange-950">正在篩選主題</p>
                                <div className="mt-2 flex items-center justify-between gap-3">
                                    <span className="text-sm text-orange-700">{selectedTheme.label}</span>
                                    <button
                                        type="button"
                                        onClick={clearThemeFilter}
                                        className="shrink-0 rounded-md px-2 py-1 text-sm font-medium text-orange-700 hover:bg-orange-100"
                                    >
                                        顯示全部
                                    </button>
                                </div>
                            </div>
                        )}

                        {selectedDurationLabel && (
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                                <p className="text-sm font-medium text-emerald-950">正在篩選天數</p>
                                <div className="mt-2 flex items-center justify-between gap-3">
                                    <span className="text-sm text-emerald-700">{selectedDurationLabel}</span>
                                    <button
                                        type="button"
                                        onClick={clearDurationFilter}
                                        className="shrink-0 rounded-md px-2 py-1 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
                                    >
                                        顯示全部
                                    </button>
                                </div>
                            </div>
                        )}

                        {selectedWeekSummary && (
                            <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3">
                                <p className="text-sm font-medium text-indigo-950">正在篩選週次</p>
                                <div className="mt-2 flex items-center justify-between gap-3">
                                    <span className="text-sm text-indigo-700">{selectedWeekSummary}</span>
                                    <button
                                        type="button"
                                        onClick={clearWeekFilter}
                                        className="shrink-0 rounded-md px-2 py-1 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
                                    >
                                        顯示全部
                                    </button>
                                </div>
                            </div>
                        )}
                    </aside>

                    <main className="space-y-5">
                        {error && (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                載入錯誤：{error}
                            </div>
                        )}

                        <section>
                            <div className="mb-3 flex items-center justify-between">
                                <div>
                                    <h2 className="text-base font-semibold text-slate-900">學校地圖</h2>
                                    <p className="text-sm text-slate-500">點擊標記或未定位清單可篩選課程</p>
                                </div>
                            </div>
                            <SchoolMap courses={courses} height="300px" />
                        </section>

                        <section>
                            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <h2 className="text-base font-semibold text-slate-900">課程列表</h2>
                                <div className="flex flex-col gap-2 sm:items-end">
                                    <span className="text-sm text-slate-500">{sortedCourses.length} 門</span>
                                    <CourseSortControl
                                        sortMode={sortMode}
                                        hasLocation={Boolean(userLocation)}
                                        locationStatus={locationStatus}
                                        onSortModeChange={setSortMode}
                                        onRequestLocation={requestLocation}
                                    />
                                </div>
                            </div>
                            <CourseList courses={sortedCourses} isLoading={isLoading} />
                        </section>
                    </main>
                </div>
            </div>
        </div>
    );
}
