import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Info, MapPin, SlidersHorizontal } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import ActiveFilterSummary from '../components/courses/ActiveFilterSummary';
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
import { useCourseStore } from '../store/courseStore';
import { countActiveFilterGroups, sortCourses, type UserLocation } from '../utils/courseFilters';
import { parseCourseSearchParams, serializeCourseSearchParams } from '../utils/courseSearchParams';
import { isCourseDataStale } from '../utils/dataFreshness';

const PAGE_SIZE = 24;
type LocationStatus = 'idle' | 'requesting' | 'ready' | 'error' | 'unsupported';

export default function CourseDashboard() {
    const { courses, schoolMapCourses, allCourses, stats, lastUpdated, isLoading, error } = useCourses();
    const {
        filters,
        sortMode,
        setSortMode,
        replaceFilters,
        replaceSearchState,
        resetSearchState,
    } = useCourseStore();
    const [searchParams, setSearchParams] = useSearchParams();
    const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
    const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const [filterDialogOpen, setFilterDialogOpen] = useState(false);
    const [schoolFinderOpen, setSchoolFinderOpen] = useState(false);
    const [urlReady, setUrlReady] = useState(false);
    const lastWrittenParams = useRef<string | null>(null);
    const resultHeadingRef = useRef<HTMLHeadingElement>(null);

    useEffect(() => {
        const current = searchParams.toString();
        if (lastWrittenParams.current === current) {
            lastWrittenParams.current = null;
            return;
        }
        const parsed = parseCourseSearchParams(searchParams);
        replaceSearchState(parsed.filters, parsed.sortMode);
        setUrlReady(true);
    }, [replaceSearchState, searchParams]);

    useEffect(() => {
        if (!urlReady) return;
        const next = serializeCourseSearchParams({ filters, sortMode }).toString();
        if (next === searchParams.toString()) return;
        lastWrittenParams.current = next;
        setSearchParams(next, { replace: true });
    }, [filters, searchParams, setSearchParams, sortMode, urlReady]);

    useEffect(() => {
        setVisibleCount(PAGE_SIZE);
    }, [filters, sortMode]);

    const sortedCourses = useMemo(
        () => sortCourses(courses, sortMode, userLocation),
        [courses, sortMode, userLocation],
    );
    const visibleCourses = sortedCourses.slice(0, visibleCount);
    const activeFilterCount = countActiveFilterGroups(filters);
    const supplementalCount = useMemo(
        () => allCourses.filter((course) => course.source?.type === 'ntpc_school_activity').length,
        [allCourses],
    );
    const updatedDate = lastUpdated
        ? new Date(lastUpdated).toLocaleDateString('zh-TW', { year: 'numeric', month: 'numeric', day: 'numeric' })
        : null;
    const dataIsStale = isCourseDataStale(lastUpdated);

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
                setSortMode('distance');
            },
            () => setLocationStatus('error'),
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 1000 * 60 * 10 },
        );
    };

    const handleSchoolSelected = () => {
        setSchoolFinderOpen(false);
        window.requestAnimationFrame(() => resultHeadingRef.current?.focus());
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
                <section className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <p className="text-sm font-medium text-indigo-600">新北市寒暑假育樂營＋逐校公開活動</p>
                    <h1 className="mt-1 text-2xl font-semibold text-slate-950">課程查詢</h1>
                    <p className="mt-2 text-sm text-slate-500">
                        {stats && `共 ${stats.total} 門課程，${stats.schools} 個學校／單位`}
                        {updatedDate && `，更新於 ${updatedDate}`}
                    </p>
                    {dataIsStale && <p role="status" className="mt-2 text-sm font-medium text-amber-700">資料已超過 8 天未更新，內容可能不是最新狀態。</p>}
                    {supplementalCount > 0 && (
                        <details className="mt-2 text-sm text-slate-600">
                            <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1.5 font-medium text-violet-700">
                                <Info className="h-4 w-4" />資料涵蓋說明
                            </summary>
                            <p className="mt-1 leading-6">包含 {supplementalCount} 門由學校另行公開、未出現在 Camp 全站搜尋的課程，並保留外校報名資格標示。</p>
                        </details>
                    )}
                </section>

                <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start lg:gap-5">
                    <aside className="min-w-0 space-y-3 lg:space-y-4">
                        <SearchBar />
                        <button type="button" onClick={() => setFilterDialogOpen(true)} className="flex min-h-12 w-full items-center justify-between rounded-lg border border-indigo-200 bg-white px-4 font-medium text-indigo-700 shadow-sm lg:hidden">
                            <span className="inline-flex items-center gap-2"><SlidersHorizontal className="h-5 w-5" />篩選課程</span>
                            <span>{activeFilterCount > 0 ? `${activeFilterCount} 組條件` : '未套用條件'}</span>
                        </button>
                        <div className="hidden space-y-4 lg:block">
                            <EligibilityFilter />
                            <GradeFilter />
                            <StatusFilter />
                            <DateRangeFilter />
                        </div>
                    </aside>

                    <main className="min-w-0">
                        {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">載入錯誤：{error}</div>}

                        <section aria-labelledby="course-results-title">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <h2 ref={resultHeadingRef} tabIndex={-1} id="course-results-title" className="text-lg font-semibold text-slate-900 outline-none">找到 {sortedCourses.length} 門課程</h2>
                                    <p aria-live="polite" className="text-sm text-slate-500">目前顯示 {Math.min(visibleCourses.length, sortedCourses.length)} 門</p>
                                </div>
                                <div className="flex flex-wrap items-start gap-2">
                                    <CourseSortControl sortMode={sortMode} hasLocation={Boolean(userLocation)} locationStatus={locationStatus} onSortModeChange={setSortMode} onRequestLocation={requestLocation} />
                                    <button type="button" onClick={() => setSchoolFinderOpen((open) => !open)} aria-expanded={schoolFinderOpen} aria-controls="school-finder-panel" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
                                        <MapPin className="h-4 w-4 text-indigo-600" />用地圖找學校
                                        {schoolFinderOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="mt-3"><ActiveFilterSummary /></div>

                            {schoolFinderOpen && (
                                <div id="school-finder-panel" className="mt-4">
                                    <SchoolMap courses={schoolMapCourses} onSchoolSelected={handleSchoolSelected} />
                                </div>
                            )}

                            <div className="mt-4">
                                <CourseList courses={visibleCourses} isLoading={isLoading} onReset={resetSearchState} />
                            </div>
                            {visibleCourses.length < sortedCourses.length && (
                                <button type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)} className="mt-4 min-h-12 w-full rounded-lg border border-indigo-200 bg-white px-4 text-sm font-medium text-indigo-700 hover:bg-indigo-50">
                                    載入更多（尚有 {sortedCourses.length - visibleCourses.length} 門）
                                </button>
                            )}
                        </section>
                    </main>
                </div>

                <div className="mt-5 lg:ml-[380px]"><SubscribePanel /></div>
            </div>

            <MobileFilterDialog
                open={filterDialogOpen}
                courses={allCourses}
                filters={filters}
                onApply={(nextFilters) => {
                    replaceFilters(nextFilters);
                    setFilterDialogOpen(false);
                }}
                onClose={() => setFilterDialogOpen(false)}
            />
        </div>
    );
}
