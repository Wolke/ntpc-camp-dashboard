import { useEffect, useMemo, useRef, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import type { Course, FilterOptions } from '../../types/course';
import { applyCourseFilters, countActiveFilterGroups, createDefaultFilters } from '../../utils/courseFilters';
import DateRangeFilter from './DateRangeFilter';
import EligibilityFilter from './EligibilityFilter';
import GradeFilter from './GradeFilter';
import StatusFilter from './StatusFilter';

interface MobileFilterDialogProps {
    open: boolean;
    courses: Course[];
    filters: FilterOptions;
    selectedSchool: string | null;
    onApply: (filters: FilterOptions) => void;
    onClose: () => void;
}

function cloneFilters(filters: FilterOptions): FilterOptions {
    return {
        ...filters,
        schoolTypes: [...filters.schoolTypes],
        dateRange: { ...filters.dateRange },
        grades: [...filters.grades],
        themeIds: [...filters.themeIds],
        registrationStatus: [...filters.registrationStatus],
        courseTimeStatus: [...filters.courseTimeStatus],
        quotaStatus: [...filters.quotaStatus],
    };
}

export default function MobileFilterDialog({
    open,
    courses,
    filters,
    selectedSchool,
    onApply,
    onClose,
}: MobileFilterDialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const triggerRef = useRef<HTMLElement | null>(null);
    const [draftFilters, setDraftFilters] = useState(() => cloneFilters(filters));

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        if (open && !dialog.open) {
            triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            setDraftFilters(cloneFilters(filters));
            dialog.showModal();
        } else if (!open && dialog.open) {
            dialog.close();
            window.requestAnimationFrame(() => triggerRef.current?.focus());
        }
    }, [filters, open]);

    const previewCount = useMemo(
        () => applyCourseFilters(courses, draftFilters, selectedSchool).length,
        [courses, draftFilters, selectedSchool],
    );

    const updateDraft = (next: Partial<FilterOptions>) => {
        setDraftFilters((current) => ({ ...current, ...next }));
    };

    const resetDraft = () => {
        const reset = createDefaultFilters();
        setDraftFilters({
            ...reset,
            searchQuery: filters.searchQuery,
            themeIds: [...filters.themeIds],
        });
    };

    return (
        <dialog
            ref={dialogRef}
            aria-labelledby="mobile-filter-title"
            onCancel={(event) => {
                event.preventDefault();
                onClose();
            }}
            onClick={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
            className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none bg-slate-950/45 p-0 backdrop:bg-transparent lg:hidden"
        >
            <div className="ml-auto flex h-full w-full max-w-md flex-col bg-slate-50 shadow-2xl">
                <div className="flex min-h-16 items-center justify-between border-b border-slate-200 bg-white px-4">
                    <div className="flex items-center gap-2">
                        <SlidersHorizontal className="h-5 w-5 text-indigo-600" />
                        <h2 id="mobile-filter-title" className="font-semibold text-slate-950">篩選課程</h2>
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                            {countActiveFilterGroups(draftFilters)} 組條件
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="關閉篩選"
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto p-4">
                    <EligibilityFilter filters={draftFilters} onChange={updateDraft} />
                    <GradeFilter filters={draftFilters} onChange={updateDraft} />
                    <StatusFilter filters={draftFilters} onChange={updateDraft} onReset={resetDraft} />
                    <DateRangeFilter filters={draftFilters} onChange={updateDraft} />
                </div>

                <div className="grid grid-cols-[auto_1fr] gap-3 border-t border-slate-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                    <button
                        type="button"
                        onClick={resetDraft}
                        className="min-h-11 rounded-md border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        重置
                    </button>
                    <button
                        type="button"
                        onClick={() => onApply(cloneFilters(draftFilters))}
                        aria-live="polite"
                        className="min-h-11 rounded-md bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700"
                    >
                        查看 {previewCount} 門課程
                    </button>
                </div>
            </div>
        </dialog>
    );
}
