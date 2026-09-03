import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, MapPin, SlidersHorizontal } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import CourseList from '../components/courses/CourseList';
import CourseSortControl from '../components/courses/CourseSortControl';
import DateRangeFilter from '../components/courses/DateRangeFilter';
import EligibilityFilter from '../components/courses/EligibilityFilter';
import GradeFilter from '../components/courses/GradeFilter';
import MobileFilterDialog from '../components/courses/MobileFilterDialog';
import SchoolMap from '../components/courses/SchoolMap';
import SearchBar from '../components/courses/SearchBar';
import StatusFilter from '../components/courses/StatusFilter';
import SubscribePanel from '../components/SubscribePanel';
import { useCourses } from '../hooks/useCourses';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useCourseStore } from '../store/courseStore';
import {
    countActiveFilterGroups,
    sortCourses,
    type CourseSortMode,
    type UserLocation,
} from '../utils/courseFilters';
import { getThemeById } from '../utils/courseTaxonomy';
import { isCourseDataStale } from '../utils/dataFreshness';

const PAGE_SIZE = 24;
type LocationStatus = 'idle' | 'requesting' | 'ready' | 'error' | 'unsupported';

export default function CourseDashboard() {
    const { courses, allCourses, stats, lastUpdated, isLoading, error } = useCourses();
    const {
        filters,
        selectedSchool,
        setSelectedSchool,
        setFilters,
        replaceFilters,
        resetFilters,
    } = useCourseStore();
    const [searchParams, setSearchParams] = useSearchParams();
    const [sortMode, setSortMode] = useState<CourseSortMode>('default');
    const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
    const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const [filterDialogOpen, setFilterDialogOpen] = useState(false);
    const [mobileMapOpen, setMobileMapOpen] = useState(false);
    const isDesktop = useMediaQuery('(min-width: 1024px)');
    const themeId = searchParams.get('theme');
    const selectedTheme = getThemeById(themeId);
    const themeFilterKey = filters.themeIds.join(',');

    useEffect(() => {
        if (themeId && !selectedTheme) {
            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete('theme');
            setSearchParams(nextParams, { replace: true });
            if (filters.themeIds.length > 0) setFilters({ themeIds: [] });
            return;
        }

        if (selectedTheme && themeFilterKey !== selectedTheme.id) {
            setFilters({ themeIds: [selectedTheme.id] });
        } else if (!themeId && filters.themeIds.length > 0) {
            setFilters({ themeIds: [] });
        }
    }, [filters.themeIds.length, searchParams, selectedTheme, setFilters, setSearchParams, themeFilterKey, themeId]);

    useEffect(() => {
        setVisibleCount(PAGE_SIZE);
    }, [filters, selectedSchool, sortMode]);

    const sortedCourses = useMemo(
        () => sortCourses(courses, sortMode, userLocation),
        [courses, sortMode, userLocation],
    );
    const visibleCourses = sortedCourses.slice(0, visibleCount);
    const resultStats = useMemo(() => ({
        external: courses.filter((course) => course.eligibility.allowExternalStudents).length,
        free: courses.filter((course) => course.fee.isFree).length,
        supplemental: courses.filter((course) => course.source?.type === 'ntpc_school_activity').length,
    }), [courses]);
    const activeFilterCount = countActiveFilterGroups(filters) + (selectedSchool ? 1 : 0);

    const updatedDate = lastUpdated
        ? new Date(lastUpdated).toLocaleDateString('zh-TW', { year: 'numeric', month: 'numeric', day: 'numeric' })
        : null;
    const dataIsStale = isCourseDataStale(lastUpdated);

    const clearThemeFilter = () => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('theme');
        setSearchParams(nextParams, { replace: true });
        setFilters({ themeIds: [] });
    };

    const resetAll = () => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('theme');
        setSearchParams(nextParams, { replace: true });
        resetFilters();
    };

    const requestLocation = () => {
        if (!navigator.geolocation) {
            setLocationStatus('unsupported');
            return;
        }
        setLocationStatus('requesting');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
                setLocationStatus('ready');
            },
            () => setLocationStatus('error'),
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 1000 * 60 * 10 },
        );
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
                <section className="mb-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-sm font-medium text-indigo-600">新北市寒暑假育樂營＋逐校公開活動</p>
                            <h1 className="mt-1 text-2xl font-semibold text-slate-950">課程查詢</h1>
                            <p className="mt-2 text-sm text-slate-500">
                                {stats && `共 ${stats.total} 門課程，${stats.schools} 個學校/單位`}
                                {updatedDate && `，資料更新於 ${updatedDate}`}
                            </p>
                            {dataIsStale && (
                                <p role="status" className="mt-2 text-sm font-medium text-amber-700">
                                    資料已超過 8 天未更新，內容可能不是最新狀態。
                                </p>
                            )}
                            {resultStats.supplemental > 0 && (
                                <p className="mt-2 text-sm text-violet-700">
                                    已補入 {resultStats.supplemental} 門未被 Camp 全站搜尋收錄的逐校公開課程，並保留外校報名資格標示。
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                            <div className="rounded-md bg-slate-50 px-3 py-2">
                                <p className="text-lg font-semibold text-slate-950">{courses.length}</p>
                                <p className="text-xs text-slate-500">目前符合</p>
                            </div>
                            <div className="rounded-md bg-slate-50 px-3 py-2">
                                <p className="text-lg font-semibold text-slate-950">{resultStats.external}</p>
                                <p className="text-xs text-slate-500">其中外校</p>
                            </div>
                            <div className="rounded-md bg-slate-50 px-3 py-2">
                                <p className="text-lg font-semibold text-slate-950">{resultStats.free}</p>
                                <p className="text-xs text-slate-500">其中免費</p>
                            </div>
                            <div className="rounded-md bg-violet-50 px-3 py-2">
                                <p className="text-lg font-semibold text-violet-900">{resultStats.supplemental}</p>
                                <p className="text-xs text-violet-600">逐校補入</p>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
                    <aside className="space-y-4">
                        <SearchBar courses={allCourses} />

                        <button
                            type="button"
                            onClick={() => setFilterDialogOpen(true)}
                            className="flex min-h-12 w-full items-center justify-between rounded-lg border border-indigo-200 bg-white px-4 font-medium text-indigo-700 shadow-sm lg:hidden"
                        >
                            <span className="inline-flex items-center gap-2">
                                <SlidersHorizontal className="h-5 w-5" />
                                篩選課程
                            </span>
                            <span>{activeFilterCount > 0 ? `${activeFilterCount} 組條件` : '全部'}</span>
                        </button>

                        <div className="hidden space-y-4 lg:block">
                            <EligibilityFilter />
                            <GradeFilter />
                            <StatusFilter />
                            <DateRangeFilter />
                        </div>

                        {selectedSchool && (
                            <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3">
                                <p className="text-sm font-medium text-indigo-900">學校篩選：{selectedSchool}</p>
                                <button type="button" onClick={() => setSelectedSchool(null)} className="mt-2 min-h-11 text-sm font-medium text-indigo-700">
                                    清除學校篩選
                                </button>
                            </div>
                        )}

                        {selectedTheme && (
                            <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
                                <p className="text-sm font-medium text-orange-950">主題：{selectedTheme.label}</p>
                                <button type="button" onClick={clearThemeFilter} className="mt-2 min-h-11 text-sm font-medium text-orange-700">
                                    清除主題篩選
                                </button>
                            </div>
                        )}
                    </aside>

                    <main className="flex min-w-0 flex-col gap-5">
                        {error && (
                            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                載入錯誤：{error}
                            </div>
                        )}

                        <section className="order-1 lg:order-2">
                            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 className="text-base font-semibold text-slate-900">課程列表</h2>
                                    <p aria-live="polite" className="text-sm text-slate-500">
                                        顯示 {Math.min(visibleCourses.length, sortedCourses.length)} / {sortedCourses.length} 門
                                    </p>
                                </div>
                                <CourseSortControl
                                    sortMode={sortMode}
                                    hasLocation={Boolean(userLocation)}
                                    locationStatus={locationStatus}
                                    onSortModeChange={setSortMode}
                                    onRequestLocation={requestLocation}
                                />
                            </div>
                            <CourseList courses={visibleCourses} isLoading={isLoading} onReset={resetAll} />
                            {visibleCourses.length < sortedCourses.length && (
                                <button
                                    type="button"
                                    onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                                    className="mt-4 min-h-12 w-full rounded-lg border border-indigo-200 bg-white px-4 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
                                >
                                    載入更多（尚有 {sortedCourses.length - visibleCourses.length} 門）
                                </button>
                            )}
                        </section>

                        <section className="order-2 lg:order-1">
                            <button
                                type="button"
                                onClick={() => setMobileMapOpen((open) => !open)}
                                aria-expanded={mobileMapOpen}
                                aria-controls="school-map-panel"
                                className="flex min-h-12 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm lg:hidden"
                            >
                                <span className="inline-flex items-center gap-2"><MapPin className="h-5 w-5" />學校地圖</span>
                                {mobileMapOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                            </button>
                            {(isDesktop || mobileMapOpen) && (
                                <div id="school-map-panel" className="mt-3 lg:mt-0">
                                    <div className="mb-3 hidden lg:block">
                                        <h2 className="text-base font-semibold text-slate-900">學校地圖</h2>
                                        <p className="text-sm text-slate-500">點擊地圖標記或下方學校清單可篩選課程</p>
                                    </div>
                                    <SchoolMap courses={allCourses} height="300px" />
                                </div>
                            )}
                        </section>
                    </main>
                </div>

                <div className="mt-5 lg:ml-[380px]">
                    <SubscribePanel />
                </div>
            </div>

            <MobileFilterDialog
                open={filterDialogOpen}
                courses={allCourses}
                filters={filters}
                selectedSchool={selectedSchool}
                onApply={(nextFilters) => {
                    replaceFilters(nextFilters);
                    setFilterDialogOpen(false);
                }}
                onClose={() => setFilterDialogOpen(false)}
            />
        </div>
    );
}
