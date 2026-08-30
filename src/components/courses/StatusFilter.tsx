import { CheckCircle, CircleDollarSign, Clock3, Filter, GraduationCap, RotateCcw } from 'lucide-react';
import { useCourseStore } from '../../store/courseStore';
import type { CourseTimeStatus, FilterOptions, QuotaStatus, RegistrationStatus } from '../../types/course';

interface StatusFilterProps {
    filters?: FilterOptions;
    onChange?: (filters: Partial<FilterOptions>) => void;
    onReset?: () => void;
}

export default function StatusFilter({ filters: controlledFilters, onChange, onReset }: StatusFilterProps = {}) {
    const store = useCourseStore();
    const filters = controlledFilters || store.filters;
    const setFilters = onChange || store.setFilters;
    const resetFilters = onReset || store.resetFilters;

    const toggleStatus = <T extends string>(
        current: T[],
        value: T,
        setter: (values: T[]) => void
    ) => {
        if (current.includes(value)) {
            setter(current.filter((v) => v !== value));
        } else {
            setter([...current, value]);
        }
    };

    const registrationOptions: { value: RegistrationStatus; label: string; icon: string }[] = [
        { value: 'available', label: '可報名', icon: '🟢' },
        { value: 'closing_soon', label: '即將截止', icon: '🟡' },
        { value: 'closed', label: '已截止', icon: '🔴' },
        { value: 'not_started', label: '尚未開放', icon: '⚪' },
    ];

    const courseTimeOptions: { value: CourseTimeStatus; label: string; icon: string }[] = [
        { value: 'upcoming', label: '即將開課', icon: '📅' },
        { value: 'ongoing', label: '進行中', icon: '▶️' },
        { value: 'ended', label: '已結束', icon: '⏹️' },
    ];

    const quotaOptions: { value: QuotaStatus; label: string; icon: string }[] = [
        { value: 'available', label: '有名額', icon: '✅' },
        { value: 'almost_full', label: '即將額滿', icon: '⚠️' },
        { value: 'full', label: '已額滿', icon: '❌' },
        { value: 'may_not_open', label: '可能未開班', icon: '❓' },
    ];

    return (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-indigo-600" />
                    <h2 className="text-sm font-semibold text-slate-800">篩選條件</h2>
                </div>
                <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                >
                    <RotateCcw className="h-3.5 w-3.5" />
                    重置
                </button>
            </div>

            <div className="space-y-4">
                <div>
                    <div className="mb-2 flex items-center gap-2">
                        <CheckCircle className="h-3.5 w-3.5 text-slate-500" />
                        <h3 className="text-xs font-semibold text-slate-500">報名狀態</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {registrationOptions.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                aria-pressed={filters.registrationStatus.includes(opt.value)}
                                onClick={() => toggleStatus(
                                    filters.registrationStatus,
                                    opt.value,
                                    (v) => setFilters({ registrationStatus: v })
                                )}
                                className={`min-h-11 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${filters.registrationStatus.includes(opt.value)
                                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                {opt.icon} {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <div className="mb-2 flex items-center gap-2">
                        <Clock3 className="h-3.5 w-3.5 text-slate-500" />
                        <h3 className="text-xs font-semibold text-slate-500">課程時間</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {courseTimeOptions.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                aria-pressed={filters.courseTimeStatus.includes(opt.value)}
                                onClick={() => toggleStatus(
                                    filters.courseTimeStatus,
                                    opt.value,
                                    (v) => setFilters({ courseTimeStatus: v })
                                )}
                                className={`min-h-11 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${filters.courseTimeStatus.includes(opt.value)
                                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                {opt.icon} {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <div className="mb-2 flex items-center gap-2">
                        <CheckCircle className="h-3.5 w-3.5 text-slate-500" />
                        <h3 className="text-xs font-semibold text-slate-500">名額狀態</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {quotaOptions.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                aria-pressed={filters.quotaStatus.includes(opt.value)}
                                onClick={() => toggleStatus(
                                    filters.quotaStatus,
                                    opt.value,
                                    (v) => setFilters({ quotaStatus: v })
                                )}
                                className={`min-h-11 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${filters.quotaStatus.includes(opt.value)
                                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                {opt.icon} {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <div className="mb-2 flex items-center gap-2">
                        <CircleDollarSign className="h-3.5 w-3.5 text-slate-500" />
                        <h3 className="text-xs font-semibold text-slate-500">費用</h3>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            aria-pressed={filters.isFree === true}
                            onClick={() => setFilters({ isFree: filters.isFree === true ? null : true })}
                            className={`min-h-11 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${filters.isFree === true
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            免費
                        </button>
                        <button
                            type="button"
                            aria-pressed={filters.isFree === false}
                            onClick={() => setFilters({ isFree: filters.isFree === false ? null : false })}
                            className={`min-h-11 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${filters.isFree === false
                                ? 'border-amber-300 bg-amber-50 text-amber-700'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            付費
                        </button>
                    </div>
                </div>

                <div>
                    <div className="mb-2 flex items-center gap-2">
                        <GraduationCap className="h-3.5 w-3.5 text-slate-500" />
                        <h3 className="text-xs font-semibold text-slate-500">學制</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            aria-pressed={filters.schoolTypes.includes('elementary')}
                            onClick={() => toggleStatus(
                                filters.schoolTypes,
                                'elementary',
                                (v) => setFilters({ schoolTypes: v })
                            )}
                            className={`min-h-11 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${filters.schoolTypes.includes('elementary')
                                ? 'border-amber-300 bg-amber-50 text-amber-700'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            國小
                        </button>
                        <button
                            type="button"
                            aria-pressed={filters.schoolTypes.includes('junior_high')}
                            onClick={() => toggleStatus(
                                filters.schoolTypes,
                                'junior_high',
                                (v) => setFilters({ schoolTypes: v })
                            )}
                            className={`min-h-11 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${filters.schoolTypes.includes('junior_high')
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            國中
                        </button>
                        <button
                            type="button"
                            aria-pressed={filters.schoolTypes.includes('high_school')}
                            onClick={() => toggleStatus(
                                filters.schoolTypes,
                                'high_school',
                                (v) => setFilters({ schoolTypes: v })
                            )}
                            className={`min-h-11 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${filters.schoolTypes.includes('high_school')
                                ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            高中職
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
