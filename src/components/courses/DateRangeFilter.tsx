import { CalendarDays, RotateCcw } from 'lucide-react';
import { useMemo } from 'react';
import { useCourseStore } from '../../store/courseStore';
import type { Course } from '../../types/course';

interface DateRangeFilterProps {
    courses: Course[];
}

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

export default function DateRangeFilter({ courses }: DateRangeFilterProps) {
    const { filters, setFilters } = useCourseStore();

    const bounds = useMemo(() => {
        const dates = courses
            .flatMap((course) => [course.schedule.startDate, course.schedule.endDate])
            .filter((date): date is string => Boolean(date))
            .sort();

        const today = new Date().toISOString().split('T')[0];

        return {
            min: dates[0] || today,
            max: dates[dates.length - 1] || addDays(new Date(), 90),
        };
    }, [courses]);

    const start = filters.dateRange.start || bounds.min;
    const end = filters.dateRange.end || bounds.max;
    const isFiltering = Boolean(filters.dateRange.start || filters.dateRange.end);

    const updateRange = (nextStart: string, nextEnd: string) => {
        setFilters({
            dateRange: {
                start: nextStart,
                end: nextEnd,
            },
        });
    };

    const resetRange = () => {
        setFilters({ dateRange: { start: null, end: null } });
    };

    const presets = [
        { label: '全部', start: bounds.min, end: bounds.max },
        { label: '本週', start: new Date().toISOString().split('T')[0], end: addDays(new Date(), 7) },
        { label: '本月', start: new Date().toISOString().split('T')[0], end: addDays(new Date(), 30) },
        { label: '暑假', start: '2026-07-01', end: '2026-08-31' },
    ].map((preset) => ({
        ...preset,
        start: preset.start < bounds.min ? bounds.min : preset.start,
        end: preset.end > bounds.max ? bounds.max : preset.end,
    }));

    return (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-slate-500" />
                    <h2 className="text-sm font-semibold text-slate-800">課程日期</h2>
                    <span className="text-xs text-slate-500">
                        {formatDisplayDate(start)} - {formatDisplayDate(end)}
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
                        value={start}
                        min={bounds.min}
                        max={end}
                        onChange={(event) => updateRange(event.target.value, end)}
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                </label>

                <span className="hidden pb-2 text-sm text-slate-300 sm:block">至</span>

                <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-500">結束日期</span>
                    <input
                        type="date"
                        value={end}
                        min={start}
                        max={bounds.max}
                        onChange={(event) => updateRange(start, event.target.value)}
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
                            onClick={() => updateRange(preset.start, preset.end)}
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
