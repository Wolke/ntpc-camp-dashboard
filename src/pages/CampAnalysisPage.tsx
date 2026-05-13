import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Compass, ExternalLink, Flame, Gauge, Sparkles, Users } from 'lucide-react';
import { useMemo } from 'react';
import { useCourses } from '../hooks/useCourses';
import { analyzeCamps } from '../utils/campAnalysis';
import { formatTimeRange } from '../utils/courseUtils';

function formatPercent(value: number): string {
    return `${Math.round(value * 100)}%`;
}

function formatNumber(value: number): string {
    return new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 0 }).format(value);
}

function shortSchoolName(name: string): string {
    return name
        .replace(/^新北市立/, '')
        .replace(/^新北市/, '')
        .replace('國民小學', '國小')
        .replace('國民中學', '國中');
}

export default function CampAnalysisPage() {
    const { allCourses, isLoading, error, lastUpdated } = useCourses();
    const analysis = useMemo(() => analyzeCamps(allCourses), [allCourses]);
    const maxThemeScore = analysis.popularThemes[0]?.score || 1;
    const updatedDate = lastUpdated
        ? new Date(lastUpdated).toLocaleDateString('zh-TW', { year: 'numeric', month: 'numeric', day: 'numeric' })
        : null;

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
                <section className="mb-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-sm font-medium text-indigo-600">營隊分析</p>
                            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
                                熱門與特色營隊檢視
                            </h1>
                            <p className="mt-2 max-w-2xl text-sm text-slate-500">
                                以現有課程資料推估：熱門看供給量、學校數、容量與已報名訊號；特色看主題稀有度、免費、跨校與跨年級等條件。
                                {updatedDate && ` 資料更新於 ${updatedDate}。`}
                            </p>
                        </div>

                        <Link
                            to="/courses"
                            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            回課程查詢
                            <ExternalLink className="h-4 w-4" />
                        </Link>
                    </div>
                </section>

                {error && (
                    <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        載入錯誤：{error}
                    </div>
                )}

                {isLoading && allCourses.length === 0 ? (
                    <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
                        正在整理營隊分析...
                    </div>
                ) : (
                    <div className="space-y-6">
                        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                                    <BarChart3 className="h-4 w-4 text-indigo-500" />
                                    課程總量
                                </div>
                                <p className="mt-2 text-2xl font-semibold text-slate-950">{formatNumber(analysis.totalCourses)}</p>
                                <p className="mt-1 text-xs text-slate-500">{analysis.totalSchools} 個學校/單位</p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                                    <Users className="h-4 w-4 text-emerald-500" />
                                    平均名額
                                </div>
                                <p className="mt-2 text-2xl font-semibold text-slate-950">{formatNumber(analysis.averagePlannedSeats)}</p>
                                <p className="mt-1 text-xs text-slate-500">限有公告預計錄取名額</p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                                    <Sparkles className="h-4 w-4 text-amber-500" />
                                    免費比例
                                </div>
                                <p className="mt-2 text-2xl font-semibold text-slate-950">{formatPercent(analysis.freeRate)}</p>
                                <p className="mt-1 text-xs text-slate-500">可作為入門友善度指標</p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                                    <Compass className="h-4 w-4 text-sky-500" />
                                    開放外校
                                </div>
                                <p className="mt-2 text-2xl font-semibold text-slate-950">{formatPercent(analysis.externalRate)}</p>
                                <p className="mt-1 text-xs text-slate-500">跨校可參加的課程占比</p>
                            </div>
                        </section>

                        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
                            <div>
                                <div className="mb-3 flex items-center gap-2">
                                    <Flame className="h-5 w-5 text-orange-500" />
                                    <div>
                                        <h2 className="text-base font-semibold text-slate-900">熱門營隊類型</h2>
                                        <p className="text-sm text-slate-500">越多學校開、課程數越多、名額與報名訊號越高，排序越前面。</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {analysis.popularThemes.slice(0, 8).map((theme, index) => (
                                        <div key={theme.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-sm font-semibold text-slate-700">
                                                            {index + 1}
                                                        </span>
                                                        <Link
                                                            to={`/courses?theme=${theme.id}`}
                                                            className="text-base font-semibold text-slate-950 hover:text-orange-700"
                                                        >
                                                            {theme.label}
                                                        </Link>
                                                    </div>
                                                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                                                        <span className="rounded-full bg-slate-100 px-2 py-1">{theme.courseCount} 門課</span>
                                                        <span className="rounded-full bg-slate-100 px-2 py-1">{theme.schoolCount} 校/單位</span>
                                                        {theme.totalPlanned > 0 && (
                                                            <span className="rounded-full bg-slate-100 px-2 py-1">預計 {theme.totalPlanned} 名</span>
                                                        )}
                                                        {theme.externalCount > 0 && (
                                                            <span className="rounded-full bg-sky-50 px-2 py-1 text-sky-700">外校 {theme.externalCount}</span>
                                                        )}
                                                        {theme.freeCount > 0 && (
                                                            <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">免費 {theme.freeCount}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="min-w-28 text-left sm:text-right">
                                                    <p className="text-xs text-slate-500">熱度分數</p>
                                                    <p className="text-lg font-semibold text-slate-950">{Math.round(theme.score)}</p>
                                                    <Link
                                                        to={`/courses?theme=${theme.id}`}
                                                        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-orange-600 hover:text-orange-700"
                                                    >
                                                        查看全部 {theme.courseCount} 門
                                                        <ArrowRight className="h-3 w-3" />
                                                    </Link>
                                                </div>
                                            </div>

                                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                                                <div
                                                    className="h-full rounded-full bg-orange-500"
                                                    style={{ width: `${Math.max(8, Math.round((theme.score / maxThemeScore) * 100))}%` }}
                                                />
                                            </div>

                                            <div className="mt-3 grid gap-2 sm:grid-cols-3">
                                                {theme.representativeCourses.map((course) => (
                                                    <Link
                                                        key={`${course.schoolName}-${course.category}-${course.schedule.startDate}`}
                                                        to="/courses"
                                                        className="rounded-md border border-slate-100 bg-slate-50 p-3 text-sm hover:bg-slate-100"
                                                    >
                                                        <p className="line-clamp-2 font-medium text-slate-800">{course.category || course.campName}</p>
                                                        <p className="mt-1 text-xs text-slate-500">{shortSchoolName(course.schoolName)}</p>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <div className="mb-3 flex items-center gap-2">
                                    <Gauge className="h-5 w-5 text-indigo-500" />
                                    <div>
                                        <h2 className="text-base font-semibold text-slate-900">資料訊號</h2>
                                        <p className="text-sm text-slate-500">目前多數營隊尚未累積報名數，排序會偏重供給與主題訊號。</p>
                                    </div>
                                </div>

                                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                                    <dl className="space-y-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <dt className="text-sm text-slate-500">有公告預計名額</dt>
                                            <dd className="font-semibold text-slate-950">
                                                {analysis.registrationSignals.coursesWithPlannedSeats} / {analysis.totalCourses}
                                            </dd>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <dt className="text-sm text-slate-500">已有報名人數</dt>
                                            <dd className="font-semibold text-slate-950">
                                                {analysis.registrationSignals.coursesWithEnrollment} / {analysis.totalCourses}
                                            </dd>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <dt className="text-sm text-slate-500">目前報名合計</dt>
                                            <dd className="font-semibold text-slate-950">{analysis.registrationSignals.totalEnrolled}</dd>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <dt className="text-sm text-slate-500">公告名額合計</dt>
                                            <dd className="font-semibold text-slate-950">{analysis.registrationSignals.totalPlanned}</dd>
                                        </div>
                                    </dl>

                                    <div className="mt-5 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                                        報名開放後，已報名人數與額滿程度會逐步變成更可靠的熱門指標；現在適合先看哪些主題供給多、哪些營隊稀有。
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section>
                            <div className="mb-3 flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-emerald-500" />
                                <div>
                                    <h2 className="text-base font-semibold text-slate-900">特色營隊</h2>
                                    <p className="text-sm text-slate-500">依少見體驗、表演型課程、特殊媒材、免費、外校與跨年級條件挑選。</p>
                                </div>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {analysis.featuredCamps.map((camp) => (
                                    <article key={`${camp.course.schoolName}-${camp.title}-${camp.course.schedule.startDate}`} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-xs font-medium text-slate-500">{shortSchoolName(camp.course.schoolName)}</p>
                                                <h3 className="mt-1 line-clamp-2 text-base font-semibold text-slate-950">{camp.title}</h3>
                                            </div>
                                            <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                                                {camp.score}
                                            </span>
                                        </div>

                                        <p className="mt-2 text-sm text-slate-500">{formatTimeRange(camp.course)}</p>

                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {camp.reasons.map((reason) => (
                                                <span key={reason} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                                                    {reason}
                                                </span>
                                            ))}
                                        </div>

                                        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                                            <span>{camp.course.fee.description || '費用未標示'}</span>
                                            {camp.course.urls?.detail && (
                                                <a
                                                    href={camp.course.urls.detail}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:text-indigo-700"
                                                >
                                                    詳細
                                                    <ExternalLink className="h-3 w-3" />
                                                </a>
                                            )}
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
}
