import { CalendarDays } from 'lucide-react';
import { useCourseStore } from '../../store/courseStore';
import type { CourseWeekday, FilterOptions } from '../../types/course';
import { COURSE_WEEKDAYS } from '../../utils/courseSchedule';

interface WeekdayFilterProps {
    filters?: FilterOptions;
    onChange?: (filters: Partial<FilterOptions>) => void;
}

export default function WeekdayFilter({ filters: controlledFilters, onChange }: WeekdayFilterProps = {}) {
    const store = useCourseStore();
    const filters = controlledFilters || store.filters;
    const setFilters = onChange || store.setFilters;

    const toggleWeekday = (weekday: CourseWeekday) => {
        const next = filters.weekdays.includes(weekday)
            ? filters.weekdays.filter((value) => value !== weekday)
            : [...filters.weekdays, weekday];
        setFilters({ weekdays: COURSE_WEEKDAYS.filter((value) => next.includes(value)) });
    };

    const buttonClass = (selected: boolean) => `min-h-11 rounded-md border px-2 py-2 text-sm font-medium transition-colors ${selected
        ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`;

    return (
        <section aria-label="上課星期" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-indigo-600" />
                <h2 className="text-sm font-semibold text-slate-800">上課星期</h2>
            </div>
            <p className="mt-2 text-xs text-slate-500">可複選，顯示符合任一選取星期的課程</p>
            <div className="mt-3 grid grid-cols-4 gap-2">
                <button
                    type="button"
                    onClick={() => setFilters({ weekdays: [] })}
                    aria-pressed={filters.weekdays.length === 0}
                    className={buttonClass(filters.weekdays.length === 0)}
                >
                    不限
                </button>
                {COURSE_WEEKDAYS.map((weekday) => {
                    const selected = filters.weekdays.includes(weekday);
                    return (
                        <button
                            key={weekday}
                            type="button"
                            onClick={() => toggleWeekday(weekday)}
                            aria-pressed={selected}
                            className={buttonClass(selected)}
                        >
                            {weekday}
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
