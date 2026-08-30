import { Globe2, Home, ListFilter } from 'lucide-react';
import { useCourseStore } from '../../store/courseStore';
import type { FilterOptions } from '../../types/course';

const options = [
    { value: true, label: '開放外校', icon: Globe2 },
    { value: null, label: '全部', icon: ListFilter },
    { value: false, label: '限本校', icon: Home },
] as const;

interface EligibilityFilterProps {
    filters?: FilterOptions;
    onChange?: (filters: Partial<FilterOptions>) => void;
}

export default function EligibilityFilter({ filters: controlledFilters, onChange }: EligibilityFilterProps = {}) {
    const store = useCourseStore();
    const filters = controlledFilters || store.filters;
    const setFilters = onChange || store.setFilters;

    return (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-800">報名資格</h2>
            <div className="mt-3 grid grid-cols-3 gap-2">
                {options.map((option) => {
                    const Icon = option.icon;
                    const selected = filters.allowExternalStudents === option.value;

                    return (
                        <button
                            key={option.label}
                            type="button"
                            onClick={() => setFilters({ allowExternalStudents: option.value })}
                            aria-pressed={selected}
                            className={`inline-flex items-center justify-center gap-1.5 rounded-md border px-2 py-2 text-sm font-medium transition-colors ${selected
                                ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <Icon className="h-4 w-4" />
                            {option.label}
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
