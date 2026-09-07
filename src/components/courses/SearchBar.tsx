import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useCourseStore } from '../../store/courseStore';
import { getQuickFilterPresets, type QuickFilterPreset } from '../../utils/courseQuickFilters';

export default function SearchBar() {
    const { filters, setFilters } = useCourseStore();
    const [inputValue, setInputValue] = useState(filters.searchQuery);

    const quickFilters = useMemo(() => getQuickFilterPresets(), []);

    useEffect(() => {
        setInputValue(filters.searchQuery);
    }, [filters.searchQuery]);

    useEffect(() => {
        if (inputValue === filters.searchQuery) return;

        const timeoutId = setTimeout(() => {
            setFilters({ searchQuery: inputValue });
        }, 300);

        return () => window.clearTimeout(timeoutId);
    }, [filters.searchQuery, inputValue, setFilters]);

    const handleClear = () => {
        setInputValue('');
    };

    const isPresetActive = (preset: QuickFilterPreset) => {
        const patch = preset.patch;
        if (patch.dateRange) {
            return filters.dateRange.start === patch.dateRange.start && filters.dateRange.end === patch.dateRange.end;
        }
        if (patch.allowExternalStudents !== undefined) return filters.allowExternalStudents === patch.allowExternalStudents;
        if (patch.isFree !== undefined) return filters.isFree === patch.isFree;
        if (patch.themeIds) return patch.themeIds.every((id) => filters.themeIds.includes(id));
        return false;
    };

    const togglePreset = (preset: QuickFilterPreset) => {
        if (!isPresetActive(preset)) {
            setFilters(preset.patch);
            return;
        }
        if (preset.patch.dateRange) setFilters({ dateRange: { start: null, end: null } });
        if (preset.patch.allowExternalStudents !== undefined) setFilters({ allowExternalStudents: null });
        if (preset.patch.isFree !== undefined) setFilters({ isFree: null });
        if (preset.patch.themeIds) setFilters({ themeIds: [] });
    };

    return (
        <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <label htmlFor="course-search" className="mb-2 block text-sm font-semibold text-slate-800">搜尋課程</label>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    id="course-search"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="搜尋學校、課程、老師、地址..."
                    className="min-h-11 w-full rounded-md border border-slate-200 bg-white py-2.5 pl-9 pr-12 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
                {inputValue && (
                    <button
                        type="button"
                        onClick={handleClear}
                        aria-label="清除搜尋"
                        className="absolute right-0 top-1/2 inline-flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-md hover:bg-slate-100"
                    >
                        <X className="h-4 w-4 text-slate-400" />
                    </button>
                )}
            </div>

            <div className="mt-2 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
                {quickFilters.map((preset) => {
                    const active = isPresetActive(preset);
                    return (
                    <button
                        key={preset.id}
                        type="button"
                        onClick={() => togglePreset(preset)}
                        aria-pressed={active}
                        className={`min-h-11 shrink-0 rounded-md border px-3 py-1 text-xs font-medium transition-colors ${active
                            ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                            : 'border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200'
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
