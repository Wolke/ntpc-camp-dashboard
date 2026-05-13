import { useState } from 'react';
import { Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { useCourseStore } from '../../store/courseStore';
import type { RegistrationStatus, CourseTimeStatus, QuotaStatus } from '../../types/course';

export default function StatusFilter() {
    const { filters, setFilters, resetFilters } = useCourseStore();
    const [isExpanded, setIsExpanded] = useState(false);

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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* 標題列 */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50"
            >
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-indigo-600" />
                    <span className="font-medium text-gray-700">篩選條件</span>
                </div>
                {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
            </button>

            {/* 展開的篩選面板 */}
            {isExpanded && (
                <div className="px-4 pb-4 space-y-4 border-t border-gray-100">
                    {/* 報名狀態 */}
                    <div className="pt-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">報名狀態</h4>
                        <div className="flex flex-wrap gap-2">
                            {registrationOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => toggleStatus(
                                        filters.registrationStatus,
                                        opt.value,
                                        (v) => setFilters({ registrationStatus: v })
                                    )}
                                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${filters.registrationStatus.includes(opt.value)
                                        ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    {opt.icon} {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 課程時間 */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">課程時間</h4>
                        <div className="flex flex-wrap gap-2">
                            {courseTimeOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => toggleStatus(
                                        filters.courseTimeStatus,
                                        opt.value,
                                        (v) => setFilters({ courseTimeStatus: v })
                                    )}
                                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${filters.courseTimeStatus.includes(opt.value)
                                        ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    {opt.icon} {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 名額狀態 */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">名額狀態</h4>
                        <div className="flex flex-wrap gap-2">
                            {quotaOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => toggleStatus(
                                        filters.quotaStatus,
                                        opt.value,
                                        (v) => setFilters({ quotaStatus: v })
                                    )}
                                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${filters.quotaStatus.includes(opt.value)
                                        ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    {opt.icon} {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 費用篩選 */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">費用</h4>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilters({ isFree: filters.isFree === true ? null : true })}
                                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${filters.isFree === true
                                    ? 'bg-green-100 border-green-300 text-green-700'
                                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                🎉 免費
                            </button>
                            <button
                                onClick={() => setFilters({ isFree: filters.isFree === false ? null : false })}
                                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${filters.isFree === false
                                    ? 'bg-yellow-100 border-yellow-300 text-yellow-700'
                                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                💰 付費
                            </button>
                        </div>
                    </div>

                    {/* 身份選擇（學校類型） */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">身份</h4>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => toggleStatus(
                                    filters.schoolTypes,
                                    'elementary',
                                    (v) => setFilters({ schoolTypes: v })
                                )}
                                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${filters.schoolTypes.includes('elementary')
                                    ? 'bg-amber-100 border-amber-300 text-amber-700'
                                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                🏫 國小生
                            </button>
                            <button
                                onClick={() => toggleStatus(
                                    filters.schoolTypes,
                                    'junior_high',
                                    (v) => setFilters({ schoolTypes: v })
                                )}
                                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${filters.schoolTypes.includes('junior_high')
                                    ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                🎒 國中生
                            </button>
                            <button
                                onClick={() => toggleStatus(
                                    filters.schoolTypes,
                                    'high_school',
                                    (v) => setFilters({ schoolTypes: v })
                                )}
                                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${filters.schoolTypes.includes('high_school')
                                    ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                📚 高中職生
                            </button>
                        </div>
                    </div>

                    {/* 年級選擇 */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">年級</h4>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { value: 1, label: '一年級' },
                                { value: 2, label: '二年級' },
                                { value: 3, label: '三年級' },
                                { value: 4, label: '四年級' },
                                { value: 5, label: '五年級' },
                                { value: 6, label: '六年級' },
                                { value: 7, label: '七年級' },
                                { value: 8, label: '八年級' },
                                { value: 9, label: '九年級' },
                            ].map((grade) => (
                                <button
                                    key={grade.value}
                                    onClick={() => {
                                        const current = filters.grades;
                                        if (current.includes(grade.value)) {
                                            setFilters({ grades: current.filter(g => g !== grade.value) });
                                        } else {
                                            setFilters({ grades: [...current, grade.value] });
                                        }
                                    }}
                                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${filters.grades.includes(grade.value)
                                        ? 'bg-purple-100 border-purple-300 text-purple-700'
                                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    {grade.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 重置按鈕 */}
                    <button
                        onClick={resetFilters}
                        className="w-full py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        重置所有篩選
                    </button>
                </div>
            )}
        </div>
    );
}
