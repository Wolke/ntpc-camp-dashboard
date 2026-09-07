import { X } from 'lucide-react';
import type { FilterOptions } from '../../types/course';
import { useCourseStore } from '../../store/courseStore';
import { DEFAULT_FILTERS, UNKNOWN_DISTRICT } from '../../utils/courseFilters';
import { getThemeById } from '../../utils/courseTaxonomy';
import { formatGradeSummary } from '../../utils/courseUtils';

const registrationLabels = { available: '可報名', closing_soon: '即將截止', closed: '已截止', not_started: '尚未開放' };
const timeLabels = { upcoming: '即將開課', ongoing: '進行中', ended: '已結束' };
const quotaLabels = { available: '有名額', almost_full: '即將額滿', full: '已額滿', may_not_open: '可能未開班' };
const typeLabels = { elementary: '國小', junior_high: '國中', high_school: '高中職' };

interface FilterChip {
    id: string;
    label: string;
    clear: Partial<FilterOptions>;
}

export default function ActiveFilterSummary() {
    const { filters, setFilters } = useCourseStore();
    const chips: FilterChip[] = [];
    const defaultTime = DEFAULT_FILTERS.courseTimeStatus;
    const timeIsDefault = filters.courseTimeStatus.length === defaultTime.length
        && defaultTime.every((status) => filters.courseTimeStatus.includes(status));

    if (filters.searchQuery) chips.push({ id: 'q', label: `搜尋：${filters.searchQuery}`, clear: { searchQuery: '' } });
    if (filters.district) chips.push({ id: 'district', label: filters.district === UNKNOWN_DISTRICT ? '未標示行政區' : filters.district, clear: { district: null } });
    if (filters.schoolName) chips.push({ id: 'school', label: `學校：${filters.schoolName}`, clear: { schoolName: null } });
    if (filters.grades.length) chips.push({ id: 'grades', label: formatGradeSummary(filters.grades), clear: { grades: [] } });
    if (filters.allowExternalStudents !== null) chips.push({ id: 'eligibility', label: filters.allowExternalStudents ? '開放外校' : '限本校', clear: { allowExternalStudents: null } });
    if (filters.isFree !== null) chips.push({ id: 'fee', label: filters.isFree ? '免費' : '付費', clear: { isFree: null } });
    if (filters.registrationStatus.length) chips.push({ id: 'reg', label: filters.registrationStatus.map((item) => registrationLabels[item]).join('、'), clear: { registrationStatus: [] } });
    if (!timeIsDefault) chips.push({ id: 'time', label: filters.courseTimeStatus.length ? filters.courseTimeStatus.map((item) => timeLabels[item]).join('、') : '全部課程時間', clear: { courseTimeStatus: [...DEFAULT_FILTERS.courseTimeStatus] } });
    if (filters.quotaStatus.length) chips.push({ id: 'quota', label: filters.quotaStatus.map((item) => quotaLabels[item]).join('、'), clear: { quotaStatus: [] } });
    if (filters.schoolTypes.length) chips.push({ id: 'types', label: filters.schoolTypes.map((item) => typeLabels[item]).join('、'), clear: { schoolTypes: [] } });
    if (filters.dateRange.start || filters.dateRange.end) chips.push({ id: 'date', label: `${filters.dateRange.start || '不限'}～${filters.dateRange.end || '不限'}`, clear: { dateRange: { start: null, end: null } } });
    if (filters.themeIds.length) chips.push({ id: 'theme', label: getThemeById(filters.themeIds[0])?.label || '課程主題', clear: { themeIds: [] } });

    if (!chips.length) return <p className="text-xs text-slate-500">預設顯示尚未結束的課程</p>;

    return (
        <div aria-label="已套用條件" className="flex flex-wrap items-center gap-2">
            {chips.map((chip) => (
                <button
                    key={chip.id}
                    type="button"
                    onClick={() => setFilters(chip.clear)}
                    aria-label={`移除篩選：${chip.label}`}
                    className="inline-flex min-h-9 items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-3 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                >
                    {chip.label}<X className="h-3.5 w-3.5" />
                </button>
            ))}
        </div>
    );
}
