import { useMemo, useState, useCallback } from 'react';
import { useCourseStore } from '../../store/courseStore';
import type { Course } from '../../types/course';

interface DateRangeSliderProps {
    courses: Course[];
}

// 將日期轉為天數（從基準日開始）
function dateToDays(dateStr: string, baseDate: Date): number {
    const date = new Date(dateStr);
    return Math.floor((date.getTime() - baseDate.getTime()) / (24 * 60 * 60 * 1000));
}

// 將天數轉回日期字串
function daysToDateStr(days: number, baseDate: Date): string {
    const date = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
    return date.toISOString().split('T')[0];
}

// 格式化日期顯示
function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
}

export default function DateRangeSlider({ courses }: DateRangeSliderProps) {
    const { filters, setFilters } = useCourseStore();

    // 計算課程日期範圍
    const dateRange = useMemo(() => {
        let minDate = Infinity;
        let maxDate = -Infinity;
        const now = new Date();
        const baseDate = new Date(now.getFullYear(), 0, 1); // 今年 1/1

        courses.forEach(course => {
            if (course.schedule.startDate) {
                const start = dateToDays(course.schedule.startDate, baseDate);
                const end = dateToDays(course.schedule.endDate, baseDate);
                minDate = Math.min(minDate, start);
                maxDate = Math.max(maxDate, end);
            }
        });

        // 如果沒資料，用今天到三個月後
        if (minDate === Infinity) {
            minDate = dateToDays(now.toISOString().split('T')[0], baseDate);
            maxDate = minDate + 90;
        }

        return { min: minDate, max: maxDate, baseDate };
    }, [courses]);

    // 本地狀態
    const [localStart, setLocalStart] = useState<number>(
        filters.dateRange?.start
            ? dateToDays(filters.dateRange.start, dateRange.baseDate)
            : dateRange.min
    );
    const [localEnd, setLocalEnd] = useState<number>(
        filters.dateRange?.end
            ? dateToDays(filters.dateRange.end, dateRange.baseDate)
            : dateRange.max
    );

    // 是否有篩選
    const isFiltering = localStart > dateRange.min || localEnd < dateRange.max;

    // 更新 store
    const applyFilter = useCallback(() => {
        setFilters({
            dateRange: {
                start: daysToDateStr(localStart, dateRange.baseDate),
                end: daysToDateStr(localEnd, dateRange.baseDate),
            }
        });
    }, [localStart, localEnd, dateRange.baseDate, setFilters]);

    // 重置
    const resetFilter = () => {
        setLocalStart(dateRange.min);
        setLocalEnd(dateRange.max);
        setFilters({
            dateRange: { start: null, end: null }
        });
    };

    const startDateStr = daysToDateStr(localStart, dateRange.baseDate);
    const endDateStr = daysToDateStr(localEnd, dateRange.baseDate);

    return (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    📅 課程日期
                </h3>
                {isFiltering && (
                    <button
                        onClick={resetFilter}
                        className="text-xs text-indigo-600 hover:text-indigo-800"
                    >
                        重置
                    </button>
                )}
            </div>

            {/* 日期輸入與顯示 */}
            <div className="flex items-center justify-between mb-4 gap-2">
                <div className="flex-1">
                    <input
                        type="date"
                        value={startDateStr}
                        min={daysToDateStr(dateRange.min, dateRange.baseDate)}
                        max={endDateStr}
                        onChange={(e) => {
                            const val = dateToDays(e.target.value, dateRange.baseDate);
                            if (!isNaN(val) && val <= localEnd) {
                                setLocalStart(val);
                                // 即時更新或等待滑鼠放開? 
                                // Input change 通常期望即時反應，但為了效能可以不做 applyFilter
                                // 這裡先只更新 localState，讓 useEffect 來處理? 
                                // 或者是直接 setFilters? 
                                // 為了保持與 slider 行為一致 (mouseup 才 apply)，這裡可以用 onBlur 或 enter?
                                // 但使用者可能希望選完就生效。
                                // 讓我們直接更新 filters，因為 date input 不像 slider 會快速觸發大量事件。
                                setFilters({
                                    dateRange: {
                                        start: e.target.value,
                                        end: endDateStr,
                                    }
                                });
                            }
                        }}
                        className="w-full px-2 py-1 text-sm border border-gray-200 rounded-lg text-center font-bold text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white/50"
                    />
                    <p className="text-xs text-gray-400 mt-1 text-center">開始日期</p>
                </div>
                <div className="text-gray-300 px-2">→</div>
                <div className="flex-1">
                    <input
                        type="date"
                        value={endDateStr}
                        min={startDateStr}
                        max={daysToDateStr(dateRange.max, dateRange.baseDate)}
                        onChange={(e) => {
                            const val = dateToDays(e.target.value, dateRange.baseDate);
                            if (!isNaN(val) && val >= localStart) {
                                setLocalEnd(val);
                                setFilters({
                                    dateRange: {
                                        start: startDateStr,
                                        end: e.target.value,
                                    }
                                });
                            }
                        }}
                        className="w-full px-2 py-1 text-sm border border-gray-200 rounded-lg text-center font-bold text-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white/50"
                    />
                    <p className="text-xs text-gray-400 mt-1 text-center">結束日期</p>
                </div>
            </div>

            {/* 雙滑桿 */}
            <div className="relative h-8 mb-2">
                {/* 軌道背景 */}
                <div className="absolute top-1/2 -translate-y-1/2 w-full h-2 bg-gray-200 rounded-full" />

                {/* 選中範圍 */}
                <div
                    className="absolute top-1/2 -translate-y-1/2 h-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                    style={{
                        left: `${((localStart - dateRange.min) / (dateRange.max - dateRange.min)) * 100}%`,
                        right: `${100 - ((localEnd - dateRange.min) / (dateRange.max - dateRange.min)) * 100}%`,
                    }}
                />

                {/* Custom styles for range slider inputs */}
                <style>{`
                    .range-slider-input {
                        pointer-events: none;
                    }
                    .range-slider-input::-webkit-slider-thumb {
                        pointer-events: auto;
                        pointer-events: all;
                        cursor: pointer;
                        /* Make the thumb logically larger for better touch target if needed, 
                           but here we just need to enable events */
                        width: 24px;
                        height: 24px;
                        -webkit-appearance: none;
                    }
                    .range-slider-input::-moz-range-thumb {
                        pointer-events: auto;
                        pointer-events: all;
                        cursor: pointer;
                        width: 24px;
                        height: 24px;
                    }
                `}</style>

                {/* 開始日期滑桿 */}
                <input
                    type="range"
                    min={dateRange.min}
                    max={dateRange.max}
                    step={1}
                    value={localStart}
                    onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val < localEnd) setLocalStart(val);
                    }}
                    onMouseUp={applyFilter}
                    onTouchEnd={applyFilter}
                    className="absolute w-full h-8 opacity-0 range-slider-input z-10"
                    style={{ zIndex: localStart > localEnd - 7 ? 30 : 10 }}
                />

                {/* 結束日期滑桿 */}
                <input
                    type="range"
                    min={dateRange.min}
                    max={dateRange.max}
                    step={1}
                    value={localEnd}
                    onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val > localStart) setLocalEnd(val);
                    }}
                    onMouseUp={applyFilter}
                    onTouchEnd={applyFilter}
                    className="absolute w-full h-8 opacity-0 range-slider-input z-20"
                />

                {/* 滑桿按鈕視覺 */}
                <div
                    className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-4 border-indigo-500 rounded-full shadow-lg pointer-events-none transition-all"
                    style={{
                        left: `calc(${((localStart - dateRange.min) / (dateRange.max - dateRange.min)) * 100}% - 12px)`,
                    }}
                />
                <div
                    className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-4 border-purple-500 rounded-full shadow-lg pointer-events-none transition-all"
                    style={{
                        left: `calc(${((localEnd - dateRange.min) / (dateRange.max - dateRange.min)) * 100}% - 12px)`,
                    }}
                />
            </div>

            {/* 日期刻度 */}
            <div className="flex justify-between text-xs text-gray-400 px-1">
                <span>{formatDate(daysToDateStr(dateRange.min, dateRange.baseDate))}</span>
                <span>{formatDate(daysToDateStr(Math.floor((dateRange.min + dateRange.max) / 2), dateRange.baseDate))}</span>
                <span>{formatDate(daysToDateStr(dateRange.max, dateRange.baseDate))}</span>
            </div>

            {/* 快捷選項 */}
            <div className="flex flex-wrap gap-2 mt-4">
                {(() => {
                    const now = new Date();
                    const todayDays = dateToDays(now.toISOString().split('T')[0], dateRange.baseDate);
                    const oneWeekLater = todayDays + 7;
                    const oneMonthLater = todayDays + 30;

                    return [
                        { label: '本週', start: todayDays, end: oneWeekLater },
                        { label: '本月', start: todayDays, end: oneMonthLater },
                        { label: '全部', start: dateRange.min, end: dateRange.max },
                    ].map((preset) => (
                        <button
                            key={preset.label}
                            onClick={() => {
                                const start = Math.max(preset.start, dateRange.min);
                                const end = Math.min(preset.end, dateRange.max);
                                setLocalStart(start);
                                setLocalEnd(end);
                                setFilters({
                                    dateRange: {
                                        start: daysToDateStr(start, dateRange.baseDate),
                                        end: daysToDateStr(end, dateRange.baseDate),
                                    }
                                });
                            }}
                            className={`px-3 py-1.5 text-sm rounded-full border transition-all ${localStart === Math.max(preset.start, dateRange.min) &&
                                localEnd === Math.min(preset.end, dateRange.max)
                                ? 'bg-indigo-500 text-white border-indigo-500'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                                }`}
                        >
                            {preset.label}
                        </button>
                    ));
                })()}
            </div>
        </div>
    );
}
