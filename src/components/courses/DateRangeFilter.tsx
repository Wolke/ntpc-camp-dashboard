import { CalendarDays, RotateCcw } from 'lucide-react';
import { useCourseStore } from '../../store/courseStore';

function formatDisplayDate(dateStr: string | null): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('zh-TW', {
        month: 'numeric',
        day: 'numeric',
    });
}

function addDays(date: Date, days: number): string {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next.toISOString().split('T')[0];
}

export default function DateRangeFilter() {
    const { filters, setFilters } = useCourseStore();
    const start = filters.dateRange.start;
    const end = filters.dateRange.end;
    const isFiltering = Boolean(filters.dateRange.start || filters.dateRange.end);

    const updateStart = (value: string) => {
        const nextStart = value || null;
        const nextEnd = nextStart && end && nextStart > end ? nextStart : end;
        setFilters({
            dateRange: {
                start: nextStart,
                end: nextEnd,
            },
        });
    };

    const updateEnd = (value: string) => {
        const nextEnd = value || null;
        const nextStart = nextEnd && start && nextEnd < start ? nextEnd : start;
        setFilters({ dateRange: { start: nextStart, end: nextEnd } });
    };

    const resetRange = () => {
        setFilters({ dateRange: { start: null, end: null } });
    };

    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    const presets = [
        { label: '全部', start: null, end: null },
        { label: '未來 7 天', start: todayString, end: addDays(today, 7) },
        { label: '未來 30 天', start: todayString, end: addDays(today, 30) },
    ];

    return (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-slate-500" />
                    <h2 className="text-sm font-semibold text-slate-800">課程日期</h2>
                    <span className="text-xs text-slate-500">
                        {isFiltering
                            ? `${formatDisplayDate(start) || '不限'} - ${formatDisplayDate(end) || '不限'}`
                            : '全部日期'}
                    </span>
                </div>
                {isFiltering && (
                    <button
                        type="button"
                        onClick={resetRange}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        重置
                    </button>
                )}
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
                <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-500">開始日期</span>
                    <input
                        type="date"
                        value={start || ''}
                        onChange={(event) => updateStart(event.target.value)}
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                </label>

                <span className="hidden pb-2 text-sm text-slate-300 sm:block">至</span>

                <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-500">結束日期</span>
                    <input
                        type="date"
                        value={end || ''}
                        onChange={(event) => updateEnd(event.target.value)}
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                </label>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
                {presets.map((preset) => {
                    const selected = start === preset.start && end === preset.end;
                    return (
                        <button
                            key={preset.label}
                            type="button"
                            onClick={() => setFilters({ dateRange: { start: preset.start, end: preset.end } })}
                            aria-pressed={selected}
                            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${selected
                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                        >
                            {preset.label}
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
