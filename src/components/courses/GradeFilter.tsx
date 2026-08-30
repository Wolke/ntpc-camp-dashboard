import { GraduationCap, RotateCcw } from 'lucide-react';
import { useCourseStore } from '../../store/courseStore';
import type { FilterOptions } from '../../types/course';

const grades = [
    { value: 1, label: '小一' },
    { value: 2, label: '小二' },
    { value: 3, label: '小三' },
    { value: 4, label: '小四' },
    { value: 5, label: '小五' },
    { value: 6, label: '小六' },
    { value: 7, label: '國一' },
    { value: 8, label: '國二' },
    { value: 9, label: '國三' },
];

interface GradeFilterProps {
    filters?: FilterOptions;
    onChange?: (filters: Partial<FilterOptions>) => void;
}

export default function GradeFilter({ filters: controlledFilters, onChange }: GradeFilterProps = {}) {
    const store = useCourseStore();
    const filters = controlledFilters || store.filters;
    const setFilters = onChange || store.setFilters;

    const toggleGrade = (grade: number) => {
        const current = filters.grades;
        const nextGrades = current.includes(grade)
            ? current.filter((value) => value !== grade)
            : [...current, grade].sort((a, b) => a - b);

        setFilters({ grades: nextGrades });
    };

    return (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-indigo-600" />
                    <h2 className="text-sm font-semibold text-slate-800">年級</h2>
                </div>

                {filters.grades.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setFilters({ grades: [] })}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        清除
                    </button>
                )}
            </div>

            <p className="mt-2 text-xs text-slate-500">多選時只顯示同時開放所有選取年級的課程</p>

            <div className="mt-3 grid grid-cols-3 gap-2">
                {grades.map((grade) => {
                    const selected = filters.grades.includes(grade.value);

                    return (
                        <button
                            key={grade.value}
                            type="button"
                            onClick={() => toggleGrade(grade.value)}
                            aria-pressed={selected}
                            className={`rounded-md border px-2 py-2 text-sm font-medium transition-colors ${selected
                                ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            {grade.label}
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
