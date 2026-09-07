import { ArrowDownUp } from 'lucide-react';
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
    { mode: 'actionable', label: '適合報名（預設）' },
    { mode: 'distance', label: '距離最近' },
    { mode: 'fee-asc', label: '費用低至高' },
    { mode: 'fee-desc', label: '費用高至低' },
    { mode: 'course-date-asc', label: '開課日近至遠' },
    { mode: 'course-date-desc', label: '開課日遠至近' },
    { mode: 'registration-date-asc', label: '報名開始近至遠' },
    { mode: 'registration-date-desc', label: '報名開始遠至近' },
] as const;

export default function CourseSortControl({
    sortMode,
    hasLocation,
    locationStatus,
    onSortModeChange,
    onRequestLocation,
}: CourseSortControlProps) {
    const handleChange = (mode: CourseSortMode) => {
        if (mode === 'distance' && !hasLocation) {
            onRequestLocation();
            return;
        }
        onSortModeChange(mode);
    };

    const statusText = {
        idle: '距離排序需允許定位',
        requesting: '正在取得位置…',
        ready: '已依目前位置排序',
        error: '無法取得位置，已保留原排序',
        unsupported: '瀏覽器不支援定位，已保留原排序',
    }[locationStatus];

    return (
        <div className="flex flex-col items-start gap-1">
            <label className="relative inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 shadow-sm">
                <ArrowDownUp className="h-4 w-4 text-slate-500" />
                <span className="sr-only">排序方式</span>
                <select
                    aria-label="排序方式"
                    value={sortMode}
                    onChange={(event) => handleChange(event.target.value as CourseSortMode)}
                    className="min-h-11 bg-transparent pr-1 text-sm font-medium text-slate-700 outline-none"
                >
                    {sortOptions.map((option) => (
                        <option key={option.mode} value={option.mode}>{option.label}</option>
                    ))}
                </select>
            </label>

            {locationStatus !== 'idle' && (
                <p role="status" className={`text-xs ${locationStatus === 'error' || locationStatus === 'unsupported' ? 'text-amber-700' : 'text-slate-500'}`}>
                    {statusText}
                </p>
            )}
        </div>
    );
}
