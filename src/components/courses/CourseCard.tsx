import { CalendarDays, CalendarPlus, Clock, ExternalLink, GraduationCap, School, Timer, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Course } from '../../types/course';
import { buildCourseCalendarUrl } from '../../utils/googleCalendar';
import { formatCourseFee, formatScheduleParts, getCourseOfficialUrl, getCourseProspectusUrl, getCourseStatusInfo, getSchoolTypeLabel } from '../../utils/courseUtils';
import RegistrationCalendarButton from './RegistrationCalendarButton';

interface CourseCardProps {
    course: Course;
    onClick?: () => void;
}

function formatCourseRegistrationRange(course: Course) {
    if (!course.registration?.startTime || !course.registration?.endTime) return '未提供報名期間';

    const options: Intl.DateTimeFormatOptions = {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    };

    return `${new Date(course.registration.startTime).toLocaleString('zh-TW', options)} - ${new Date(course.registration.endTime).toLocaleString('zh-TW', options)}`;
}

interface MetaTagProps {
    icon: LucideIcon;
    label: string;
    tone?: 'slate' | 'indigo' | 'emerald' | 'amber';
}

const metaTagToneClasses = {
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
    indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
};

function MetaTag({ icon: Icon, label, tone = 'slate' }: MetaTagProps) {
    return (
        <span className={`inline-flex min-h-[2rem] items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium ${metaTagToneClasses[tone]}`}>
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span>{label}</span>
        </span>
    );
}

export default function CourseCard({ course, onClick }: CourseCardProps) {
    const status = getCourseStatusInfo(course);
    const scheduleParts = formatScheduleParts(course);
    const officialUrl = getCourseOfficialUrl(course);
    const prospectusUrl = getCourseProspectusUrl(course);

    return (
        <article
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            onClick={onClick}
        >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                            <School className="h-3.5 w-3.5" />
                            {getSchoolTypeLabel(course.schoolName)}
                        </span>
                        <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${status.registrationColor}`}>
                            {status.registrationLabel}
                            {status.daysLeft !== null && status.daysLeft <= 7 && (
                                <span className="ml-1">剩 {status.daysLeft} 天</span>
                            )}
                        </span>
                        <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${status.quotaColor}`}>
                            {status.quotaLabel}
                        </span>
                        <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${course.eligibility.allowExternalStudents
                            ? 'border-sky-200 bg-sky-50 text-sky-700'
                            : 'border-amber-200 bg-amber-50 text-amber-700'
                            }`}>
                            {course.eligibility.allowExternalStudents ? '開放外校' : '限本校'}
                        </span>
                        {course.source?.type === 'ntpc_school_activity' && (
                            <span className="inline-flex items-center rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700">
                                逐校公開・全站未索引
                            </span>
                        )}
                    </div>

                    <h3 className="text-base font-semibold leading-6 text-slate-950">
                        {course.category || course.courseName}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">{course.schoolName}</p>
                </div>

                <div className="text-left sm:text-right">
                    <p className={`text-sm font-semibold ${course.fee.isFree ? 'text-emerald-700' : 'text-slate-700'}`}>
                        {formatCourseFee(course)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                        報名 {course.quota.enrolled} / 預計 {course.quota.planned}
                    </p>
                </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
                <MetaTag icon={CalendarDays} label={scheduleParts.dateRange} tone="indigo" />
                {scheduleParts.weekSummary && (
                    <MetaTag icon={CalendarDays} label={scheduleParts.weekSummary} tone="indigo" />
                )}
                {scheduleParts.weekdaySummary && (
                    <MetaTag icon={CalendarDays} label={scheduleParts.weekdaySummary} tone="indigo" />
                )}
                {scheduleParts.periodSummary && (
                    <MetaTag icon={Clock} label={scheduleParts.periodSummary} tone="emerald" />
                )}
                {scheduleParts.clockSummary && (
                    <MetaTag icon={Timer} label={scheduleParts.clockSummary} tone="emerald" />
                )}
                <MetaTag icon={CalendarPlus} label={`報名 ${formatCourseRegistrationRange(course)}`} />
                {course.courseName && (
                    <MetaTag icon={GraduationCap} label={course.courseName} />
                )}
                {course.eligibility.gradeNames.map((gradeName) => (
                    <MetaTag key={gradeName} icon={Users} label={gradeName} tone="amber" />
                ))}
                {course.eligibility.restrictions.map((restriction) => (
                    <MetaTag key={restriction} icon={Users} label={restriction} tone="amber" />
                ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                {officialUrl && (
                    <a
                        href={officialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                    >
                        <ExternalLink className="h-4 w-4" />
                        查看官方詳情
                    </a>
                )}
                {prospectusUrl && (
                    <a
                        href={prospectusUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                    >
                        <ExternalLink className="h-4 w-4" />
                        活動簡章
                    </a>
                )}

                <a
                    href={buildCourseCalendarUrl(course)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                    <CalendarPlus className="h-4 w-4" />
                    加入日曆
                </a>

                <RegistrationCalendarButton course={course} />
            </div>
        </article>
    );
}
