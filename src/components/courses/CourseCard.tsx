import {
    CalendarDays,
    CalendarPlus,
    ChevronDown,
    Clock,
    ExternalLink,
    FileText,
    GraduationCap,
    Info,
    School,
    User,
    Users,
} from 'lucide-react';
import type { Course } from '../../types/course';
import { buildCourseCalendarUrl } from '../../utils/googleCalendar';
import {
    formatCourseFee,
    formatGradeSummary,
    formatScheduleParts,
    getCourseOfficialUrl,
    getCourseProspectusUrl,
    getCourseStatusInfo,
} from '../../utils/courseUtils';
import RegistrationCalendarButton from './RegistrationCalendarButton';

interface CourseCardProps {
    course: Course;
}

function formatCourseRegistrationRange(course: Course) {
    if (!course.registration?.startTime || !course.registration?.endTime) return '未提供報名期間';
    const options: Intl.DateTimeFormatOptions = {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    };
    return `${new Date(course.registration.startTime).toLocaleString('zh-TW', options)} – ${new Date(course.registration.endTime).toLocaleString('zh-TW', options)}`;
}

export default function CourseCard({ course }: CourseCardProps) {
    const status = getCourseStatusInfo(course);
    const schedule = formatScheduleParts(course);
    const officialUrl = getCourseOfficialUrl(course);
    const prospectusUrl = getCourseProspectusUrl(course);
    const activeRegistration = status.registration === 'available' || status.registration === 'closing_soon';
    const notStarted = status.registration === 'not_started';
    const officialLabel = activeRegistration
        ? '查看官方報名資訊'
        : notStarted ? '查看官方活動資訊' : '查看官方活動紀錄';
    const quotaText = course.quota.planned > 0
        ? `報名 ${course.quota.enrolled}／名額 ${course.quota.planned}`
        : '名額未標示';

    return (
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${status.registrationColor}`}>
                    {status.registrationLabel}
                    {status.daysLeft !== null && status.daysLeft <= 7 && <span className="ml-1">剩 {status.daysLeft} 天</span>}
                </span>
                <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${course.eligibility.allowExternalStudents
                    ? 'border-sky-200 bg-sky-50 text-sky-700'
                    : 'border-amber-200 bg-amber-50 text-amber-700'
                }`}>
                    {course.eligibility.allowExternalStudents ? '開放外校' : '限本校'}
                </span>
                {(status.quota === 'almost_full' || status.quota === 'full' || status.quota === 'may_not_open') && (
                    <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${status.quotaColor}`}>
                        {status.quotaLabel}
                    </span>
                )}
            </div>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <h3 className="text-lg font-semibold leading-6 text-slate-950">{course.category || course.courseName}</h3>
                    <p className="mt-1 inline-flex items-start gap-1.5 text-sm text-slate-500">
                        <School className="mt-0.5 h-4 w-4 shrink-0" />{course.schoolName}
                    </p>
                </div>
                <div className="shrink-0 text-left sm:text-right">
                    <p className={`text-base font-semibold ${course.fee.isFree ? 'text-emerald-700' : 'text-slate-800'}`}>{formatCourseFee(course)}</p>
                    <p className="mt-1 text-xs text-slate-500">{quotaText}</p>
                </div>
            </div>

            <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                <p className="inline-flex items-start gap-2">
                    <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                    <span>{schedule.dateRange}{schedule.weekSummary ? ` · ${schedule.weekSummary}` : ''}{schedule.weekdaySummary ? ` · ${schedule.weekdaySummary}` : ''}</span>
                </p>
                <p className="inline-flex items-start gap-2">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{[schedule.periodSummary, schedule.clockSummary].filter(Boolean).join(' · ') || '時間未標示'}</span>
                </p>
                <p className="inline-flex items-start gap-2 sm:col-span-2">
                    <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <span>{formatGradeSummary(course.eligibility.grades)}</span>
                </p>
            </div>

            {course.eligibility.restrictions.length > 0 && (
                <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                    報名限制：{course.eligibility.restrictions.join('、')}
                </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                {officialUrl ? (
                    <a
                        href={officialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${status.registration === 'closed'
                            ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                    >
                        <ExternalLink className="h-4 w-4" />{officialLabel}
                    </a>
                ) : (
                    <span className="inline-flex min-h-11 items-center text-sm text-slate-500">官方連結未提供</span>
                )}
                {notStarted && <RegistrationCalendarButton course={course} />}
            </div>

            <details className="group mt-3 border-t border-slate-100 pt-2">
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md px-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                    <Info className="h-4 w-4" />更多資訊與工具
                    <ChevronDown className="ml-auto h-4 w-4 transition-transform group-open:rotate-180" />
                </summary>
                <div className="grid gap-3 px-2 pb-2 pt-3 text-sm text-slate-600 sm:grid-cols-2">
                    <p className="inline-flex items-start gap-2"><CalendarPlus className="mt-0.5 h-4 w-4 shrink-0" /><span>報名：{formatCourseRegistrationRange(course)}</span></p>
                    {course.teacher && <p className="inline-flex items-start gap-2"><User className="mt-0.5 h-4 w-4 shrink-0" /><span>老師：{course.teacher}</span></p>}
                    {course.campName && <p className="inline-flex items-start gap-2"><Users className="mt-0.5 h-4 w-4 shrink-0" /><span>活動：{course.campName}</span></p>}
                    {course.source?.type === 'ntpc_school_activity' && (
                        <p className="inline-flex items-start gap-2 text-violet-700"><Info className="mt-0.5 h-4 w-4 shrink-0" /><span>學校另行公開（Camp 全站未收錄）</span></p>
                    )}
                </div>
                <div className="flex flex-wrap gap-2 px-2 pb-2">
                    {prospectusUrl && (
                        <a href={prospectusUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                            <FileText className="h-4 w-4" />活動簡章
                        </a>
                    )}
                    <a href={buildCourseCalendarUrl(course)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700">
                        <CalendarPlus className="h-4 w-4" />加入課程日曆
                    </a>
                </div>
            </details>
        </article>
    );
}
