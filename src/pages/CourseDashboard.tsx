import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import CourseList from '../components/courses/CourseList';
import DateRangeFilter from '../components/courses/DateRangeFilter';
import EligibilityFilter from '../components/courses/EligibilityFilter';
import GradeFilter from '../components/courses/GradeFilter';
import SchoolMap from '../components/courses/SchoolMap';
import SearchBar from '../components/courses/SearchBar';
import StatusFilter from '../components/courses/StatusFilter';
import SubscribePanel from '../components/SubscribePanel';
import { useCourses } from '../hooks/useCourses';
import { useCourseStore } from '../store/courseStore';
import { getThemeById } from '../utils/courseTaxonomy';

export default function CourseDashboard() {
    const { courses, allCourses, stats, lastUpdated, isLoading, error } = useCourses();
    const { filters, selectedSchool, setSelectedSchool, setFilters, resetFilters } = useCourseStore();
    const [searchParams, setSearchParams] = useSearchParams();
    const themeId = searchParams.get('theme');
    const selectedTheme = getThemeById(themeId);

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

    const clearThemeFilter = () => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('theme');
        setSearchParams(nextParams, { replace: true });
        resetFilters();
    };

    const updatedDate = lastUpdated
        ? new Date(lastUpdated).toLocaleDateString('zh-TW', { year: 'numeric', month: 'numeric', day: 'numeric' })
        : null;

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
                    <aside className="space-y-4 lg:sticky lg:top-20">
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
                            <div className="mb-3 flex items-center justify-between">
                                <h2 className="text-base font-semibold text-slate-900">課程列表</h2>
                                <span className="text-sm text-slate-500">{courses.length} 門</span>
                            </div>
                            <CourseList courses={courses} isLoading={isLoading} />
                        </section>
                    </main>
                </div>
            </div>
        </div>
    );
}
