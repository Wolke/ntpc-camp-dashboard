import { Link } from 'react-router-dom';
import { CalendarDays, ExternalLink, Gift, Globe2, ListChecks } from 'lucide-react';
import { useMemo } from 'react';
import { useCourses } from '../hooks/useCourses';
import { formatCourseWeekSummary, getWeekInfosInRange } from '../utils/courseSchedule';
import { classifyTheme } from '../utils/courseTaxonomy';

const summerStart = '2026-07-01';
const summerEnd = '2026-08-31';

function formatDate(dateStr: string): string {
    const date = new Date(`${dateStr}T00:00:00`);
    return `${date.getMonth() + 1}/${date.getDate()}`;
}

export default function SummerWeeksPage() {
    const { allCourses, isLoading, error } = useCourses();

    const weeks = useMemo(() => {
        const summerCourses = allCourses.filter((course) =>
            course.schedule.startDate >= summerStart && course.schedule.startDate <= summerEnd
        );

        return getWeekInfosInRange(summerStart, summerEnd).map((week) => {
            const courses = summerCourses.filter((course) => formatCourseWeekSummary(course) === week.label);
            const themeCounts = new Map<string, number>();
            courses.forEach((course) => {
                const theme = classifyTheme(course);
                themeCounts.set(theme.label, (themeCounts.get(theme.label) ?? 0) + 1);
            });

            const topThemes = Array.from(themeCounts.entries())
                .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-TW'))
                .slice(0, 3)
                .map(([label]) => label);

            return {
                ...week,
                courses,
                topThemes,
                externalCount: courses.filter((course) => course.eligibility.allowExternalStudents).length,
                freeCount: courses.filter((course) => course.fee.isFree).length,
            };
        });
    }, [allCourses]);

    const totalSummerCourses = weeks.reduce((sum, week) => sum + week.courses.length, 0);
    const activeWeeks = weeks.filter((week) => week.courses.length > 0).length;
    const busiestWeek = weeks.reduce<typeof weeks[number] | null>(
        (current, week) => !current || week.courses.length > current.courses.length ? week : current,
        null
    );

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
                <section className="mb-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-sm font-medium text-indigo-600">2026 暑假</p>
                            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
                                暑假周次表
                            </h1>
                            <p className="mt-2 text-sm text-slate-500">
                                依週一到週日整理 7/1 - 8/31，每個課程以開課日歸到對應週次。
                            </p>
                        </div>

                        <Link
                            to="/courses"
                            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100"
                        >
                            到課程查詢
                            <ExternalLink className="h-4 w-4" />
                        </Link>
                    </div>
                </section>

                {error && (
                    <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        載入錯誤：{error}
                    </div>
                )}

                <section className="mb-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-xs font-medium text-slate-500">暑假課程</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-950">{totalSummerCourses}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-xs font-medium text-slate-500">有課程週次</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-950">{activeWeeks}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-xs font-medium text-slate-500">最密集週次</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-950">{busiestWeek?.label ?? '-'}</p>
                    </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-4 py-3">
                        <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-indigo-600" />
                            <h2 className="text-base font-semibold text-slate-900">週次總覽</h2>
                        </div>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {weeks.map((week) => (
                            <Link
                                key={week.label}
                                to={`/courses?week=${encodeURIComponent(week.label)}`}
                                className="grid gap-4 px-4 py-4 transition-colors hover:bg-slate-50 lg:grid-cols-[180px_minmax(0,1fr)_220px] lg:items-center"
                            >
                                <div>
                                    <p className="text-base font-semibold text-slate-950">{week.label}</p>
                                    <p className="mt-1 text-sm text-slate-500">
                                        {formatDate(week.startDate)} - {formatDate(week.endDate)}
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {week.topThemes.length > 0 ? (
                                        week.topThemes.map((theme) => (
                                            <span key={theme} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                                                {theme}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-sm text-slate-400">目前沒有課程</span>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-2 lg:justify-end">
                                    <span className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                                        <ListChecks className="h-3.5 w-3.5" />
                                        {week.courses.length} 門
                                    </span>
                                    <span className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
                                        <Globe2 className="h-3.5 w-3.5" />
                                        外校 {week.externalCount}
                                    </span>
                                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                        <Gift className="h-3.5 w-3.5" />
                                        免費 {week.freeCount}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

                {isLoading && (
                    <p className="mt-4 text-sm text-slate-500">正在載入課程資料...</p>
                )}
            </div>
        </div>
    );
}
