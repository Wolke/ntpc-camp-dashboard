import { useMemo, useState } from 'react';
import { ExternalLink, SlidersHorizontal, Sparkles, UserCheck } from 'lucide-react';
import { useCourses } from '../hooks/useCourses';
import { type AdvisorProfile, TRAIT_OPTIONS, getAdvisorRecommendations } from '../utils/aiAdvisor';
import { formatTimeRange } from '../utils/courseUtils';

const DEFAULT_PROFILE: AdvisorProfile = {
    area: '三重',
    grade: 4,
    traits: ['active', 'tech', 'confidence'],
    timePreference: 'all',
    budgetMode: 'flexible',
    minBudget: null,
    maxBudget: null,
    notes: '',
};

const fitLabels = {
    high: '優先考慮',
    medium: '可列入',
    explore: '再觀察',
};

const fitClasses = {
    high: 'bg-emerald-50 text-emerald-700',
    medium: 'bg-indigo-50 text-indigo-700',
    explore: 'bg-slate-100 text-slate-600',
};

const budgetClasses = {
    free: 'bg-emerald-50 text-emerald-700',
    within: 'bg-sky-50 text-sky-700',
    below_range: 'bg-amber-50 text-amber-700',
    above_range: 'bg-red-50 text-red-700',
    unknown: 'bg-slate-100 text-slate-600',
};

function updateTrait(traits: string[], trait: string): string[] {
    return traits.includes(trait)
        ? traits.filter((item) => item !== trait)
        : [...traits, trait];
}

function groupByDate<T extends { course: { schedule: { startDate: string | null } } }>(items: T[]) {
    return items.reduce<Record<string, T[]>>((groups, item) => {
        const key = item.course.schedule.startDate || '未標示日期';
        groups[key] = groups[key] || [];
        groups[key].push(item);
        return groups;
    }, {});
}

function formatDateLabel(date: string): string {
    if (date === '未標示日期') return date;
    return new Date(date).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', weekday: 'short' });
}

export default function AiAdvisorPage() {
    const { allCourses, isLoading, error } = useCourses();
    const [profile, setProfile] = useState<AdvisorProfile>(DEFAULT_PROFILE);
    const result = useMemo(() => getAdvisorRecommendations(allCourses, profile), [allCourses, profile]);
    const groupedRecommendations = useMemo(() => groupByDate(result.recommendations), [result.recommendations]);

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
                <section className="mb-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-sm font-medium text-indigo-600">AI 營隊顧問</p>
                            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
                                先理解孩子，再依時間推薦營隊
                            </h1>
                            <p className="mt-2 max-w-2xl text-sm text-slate-500">
                                用現有課程資料做即時建議：先整理個性、地區、年級與限制，再依開課時間逐一列出適合度與理由。
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => setProfile(DEFAULT_PROFILE)}
                            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                            套用三重四年級範例
                        </button>
                    </div>
                </section>

                {error && (
                    <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        載入錯誤：{error}
                    </div>
                )}

                <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
                    <aside className="space-y-4 lg:sticky lg:top-20">
                        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="flex items-center gap-2">
                                <UserCheck className="h-5 w-5 text-indigo-500" />
                                <h2 className="text-base font-semibold text-slate-900">孩子輪廓</h2>
                            </div>

                            <div className="mt-4 grid gap-3">
                                <label className="text-sm font-medium text-slate-700">
                                    地區或學校關鍵字
                                    <input
                                        value={profile.area}
                                        onChange={(event) => setProfile({ ...profile, area: event.target.value })}
                                        className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                                        placeholder="例如：三重、林口、臺北"
                                    />
                                </label>

                                <label className="text-sm font-medium text-slate-700">
                                    年級
                                    <select
                                        value={profile.grade}
                                        onChange={(event) => setProfile({ ...profile, grade: Number(event.target.value) })}
                                        className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                                    >
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((grade) => (
                                            <option key={grade} value={grade}>{grade} 年級</option>
                                        ))}
                                    </select>
                                </label>

                                <label className="text-sm font-medium text-slate-700">
                                    時段
                                    <select
                                        value={profile.timePreference}
                                        onChange={(event) => setProfile({ ...profile, timePreference: event.target.value as AdvisorProfile['timePreference'] })}
                                        className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                                    >
                                        <option value="all">都可以</option>
                                        <option value="morning">上午</option>
                                        <option value="afternoon">下午</option>
                                        <option value="full_day">全天</option>
                                    </select>
                                </label>

                                <label className="text-sm font-medium text-slate-700">
                                    預算模式
                                    <select
                                        value={profile.budgetMode}
                                        onChange={(event) => {
                                            const budgetMode = event.target.value as AdvisorProfile['budgetMode'];
                                            setProfile({
                                                ...profile,
                                                budgetMode,
                                                minBudget: budgetMode === 'range' ? 500 : null,
                                                maxBudget: budgetMode === 'flexible' || budgetMode === 'free_only' ? null : 2500,
                                            });
                                        }}
                                        className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                                    >
                                        <option value="flexible">預算彈性，先看適合度</option>
                                        <option value="free_only">只看免費</option>
                                        <option value="max">有明確上限</option>
                                        <option value="range">希望落在範圍內</option>
                                    </select>
                                </label>

                                {profile.budgetMode === 'max' && (
                                    <label className="text-sm font-medium text-slate-700">
                                        可接受上限
                                        <input
                                            type="number"
                                            min="0"
                                            step="100"
                                            value={profile.maxBudget ?? 2500}
                                            onChange={(event) => setProfile({ ...profile, maxBudget: Number(event.target.value) })}
                                            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                                        />
                                    </label>
                                )}

                                {profile.budgetMode === 'range' && (
                                    <div className="grid grid-cols-2 gap-2">
                                        <label className="text-sm font-medium text-slate-700">
                                            最低
                                            <input
                                                type="number"
                                                min="0"
                                                step="100"
                                                value={profile.minBudget ?? 500}
                                                onChange={(event) => setProfile({ ...profile, minBudget: Number(event.target.value) })}
                                                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                                            />
                                        </label>
                                        <label className="text-sm font-medium text-slate-700">
                                            最高
                                            <input
                                                type="number"
                                                min="0"
                                                step="100"
                                                value={profile.maxBudget ?? 2500}
                                                onChange={(event) => setProfile({ ...profile, maxBudget: Number(event.target.value) })}
                                                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                                            />
                                        </label>
                                    </div>
                                )}

                                <div className="rounded-md bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
                                    {profile.budgetMode === 'flexible' && '目前不排除較高費用，推薦會把費用清楚列出。'}
                                    {profile.budgetMode === 'free_only' && '只留下免費營隊。'}
                                    {profile.budgetMode === 'max' && `只留下 ${profile.maxBudget ?? 2500} 元內的營隊。`}
                                    {profile.budgetMode === 'range' && `只留下 ${profile.maxBudget ?? 2500} 元內，並標示是否低於 ${profile.minBudget ?? 500} 元。`}
                                </div>
                            </div>
                        </section>

                        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                            <h2 className="text-base font-semibold text-slate-900">個性與興趣</h2>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {TRAIT_OPTIONS.map((option) => {
                                    const active = profile.traits.includes(option.id);
                                    return (
                                        <button
                                            key={option.id}
                                            type="button"
                                            onClick={() => setProfile({ ...profile, traits: updateTrait(profile.traits, option.id) })}
                                            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${active
                                                ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                                }`}
                                        >
                                            {option.label}
                                        </button>
                                    );
                                })}
                            </div>

                            <label className="mt-4 block text-sm font-medium text-slate-700">
                                其他補充
                                <textarea
                                    value={profile.notes}
                                    onChange={(event) => setProfile({ ...profile, notes: event.target.value })}
                                    className="mt-1 min-h-24 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                                    placeholder="例如：怕太競爭、想先嘗試半天、朋友也在三重..."
                                />
                            </label>
                        </section>
                    </aside>

                    <main className="space-y-5">
                        <section className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
                            <div className="flex items-start gap-3">
                                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
                                <div>
                                    <h2 className="text-base font-semibold text-indigo-950">AI 先整理出的判斷</h2>
                                    <p className="mt-2 text-sm leading-6 text-indigo-900">{result.summary}</p>
                                    {profile.notes && (
                                        <p className="mt-2 text-sm leading-6 text-indigo-800">家長補充：{profile.notes}</p>
                                    )}
                                </div>
                            </div>
                        </section>

                        {isLoading && allCourses.length === 0 ? (
                            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
                                正在讀取課程資料...
                            </div>
                        ) : result.recommendations.length === 0 ? (
                            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
                                目前條件沒有找到合適課程。可以放寬地區、預算或時段。
                            </div>
                        ) : (
                            Object.entries(groupedRecommendations).map(([date, recommendations]) => (
                                <section key={date}>
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <h2 className="text-base font-semibold text-slate-900">{formatDateLabel(date)}</h2>
                                        <span className="text-sm text-slate-500">{recommendations.length} 門建議</span>
                                    </div>

                                    <div className="space-y-3">
                                        {recommendations.map((recommendation) => (
                                            <article
                                                key={`${recommendation.course.schoolName}-${recommendation.title}-${recommendation.course.schedule.startTime}`}
                                                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                                            >
                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className={`rounded-full px-2 py-1 text-xs font-medium ${fitClasses[recommendation.fit]}`}>
                                                                {fitLabels[recommendation.fit]}
                                                            </span>
                                                            <span className={`rounded-full px-2 py-1 text-xs font-medium ${budgetClasses[recommendation.budgetStatus]}`}>
                                                                {recommendation.budgetLabel}
                                                            </span>
                                                            <span className="text-xs text-slate-500">分數 {recommendation.score}</span>
                                                        </div>
                                                        <h3 className="mt-2 text-base font-semibold text-slate-950">{recommendation.title}</h3>
                                                        <p className="mt-1 text-sm text-slate-500">{recommendation.course.schoolName}</p>
                                                    </div>

                                                    <div className="text-sm text-slate-600 sm:text-right">
                                                        <p>{formatTimeRange(recommendation.course)}</p>
                                                        <p className="mt-1 font-medium text-slate-900">{recommendation.budgetLabel}</p>
                                                    </div>
                                                </div>

                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {recommendation.reasons.map((reason) => (
                                                        <span key={reason} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                                                            {reason}
                                                        </span>
                                                    ))}
                                                    {recommendation.cautions.map((caution) => (
                                                        <span key={caution} className="rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-700">
                                                            {caution}
                                                        </span>
                                                    ))}
                                                </div>

                                                <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                                                    <span className="text-slate-500">
                                                        {recommendation.course.eligibility.gradeNames.join('、')}
                                                    </span>
                                                    {recommendation.course.urls?.detail && (
                                                        <a
                                                            href={recommendation.course.urls.detail}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:text-indigo-700"
                                                        >
                                                            詳細
                                                            <ExternalLink className="h-4 w-4" />
                                                        </a>
                                                    )}
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                </section>
                            ))
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}
