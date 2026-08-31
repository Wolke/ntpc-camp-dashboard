import { ArrowDownUp, CalendarDays, CircleDollarSign, LocateFixed } from 'lucide-react';
import type { CourseSortMode } from '../../utils/courseFilters';

export type { CourseSortMode } from '../../utils/courseFilters';

interface CourseSortControlProps {
    sortMode: CourseSortMode;
    hasLocation: boolean;
    locationStatus: 'idle' | 'requesting' | 'ready' | 'error' | 'unsupported';
    onSortModeChange: (mode: CourseSortMode) => void;
    onRequestLocation: () => void;
}

const sortOptions = [
    { mode: 'default', label: '即將開課', icon: ArrowDownUp },
    { mode: 'distance', label: '距離', icon: LocateFixed },
    { mode: 'fee-asc', label: '費用低', icon: CircleDollarSign },
    { mode: 'fee-desc', label: '費用高', icon: CircleDollarSign },
    { mode: 'course-date-asc', label: '課程近', icon: CalendarDays },
    { mode: 'course-date-desc', label: '課程遠', icon: CalendarDays },
    { mode: 'registration-date-asc', label: '報名近', icon: CalendarDays },
    { mode: 'registration-date-desc', label: '報名遠', icon: CalendarDays },
] as const;

export default function CourseSortControl({
    sortMode,
    hasLocation,
    locationStatus,
    onSortModeChange,
    onRequestLocation,
}: CourseSortControlProps) {
    const handleClick = (mode: CourseSortMode) => {
        if (mode === 'distance' && !hasLocation) {
            onRequestLocation();
        }
        onSortModeChange(mode);
    };

    const statusText = {
        idle: '距離排序需允許定位',
        requesting: '正在取得位置...',
        ready: '依目前位置排序',
        error: '無法取得位置',
        unsupported: '瀏覽器不支援定位',
    }[locationStatus];

    return (
        <div className="flex flex-col items-start gap-2 sm:items-end">
            <div className="inline-flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                {sortOptions.map((option) => {
                    const Icon = option.icon;
                    const selected = sortMode === option.mode;

                    return (
                        <button
                            key={option.mode}
                            type="button"
                            onClick={() => handleClick(option.mode)}
                            aria-pressed={selected}
                            className={`inline-flex min-h-11 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${selected
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                                }`}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            {option.label}
                        </button>
                    );
                })}
            </div>

            {(sortMode === 'distance' || locationStatus === 'requesting' || locationStatus === 'error') && (
                <p aria-live="polite" className={`text-xs ${locationStatus === 'error' || locationStatus === 'unsupported'
                    ? 'text-amber-600'
                    : 'text-slate-500'
                    }`}
                >
                    {statusText}
                </p>
            )}
        </div>
    );
}
