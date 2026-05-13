import { CalendarPlus, Clock, ExternalLink, GraduationCap, School, Users } from 'lucide-react';
import type { Course } from '../../types/course';
import { buildCourseCalendarUrl } from '../../utils/googleCalendar';
import { formatTimeRange, getCourseStatusInfo, getSchoolTypeLabel } from '../../utils/courseUtils';
import RegistrationCalendarButton from './RegistrationCalendarButton';

interface CourseCardProps {
    course: Course;
    onClick?: () => void;
}

function formatRegistrationRange(course: Course) {
    if (!course.registration?.startTime || !course.registration?.endTime) return '未提供報名期間';

    const options: Intl.DateTimeFormatOptions = {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    };

    return `${new Date(course.registration.startTime).toLocaleString('zh-TW', options)} - ${new Date(course.registration.endTime).toLocaleString('zh-TW', options)}`;
}

export default function CourseCard({ course, onClick }: CourseCardProps) {
    const status = getCourseStatusInfo(course);

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
                    </div>

                    <h3 className="text-base font-semibold leading-6 text-slate-950">
                        {course.category || course.courseName}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">{course.schoolName}</p>
                </div>

                <div className="text-left sm:text-right">
                    <p className={`text-sm font-semibold ${course.fee.isFree ? 'text-emerald-700' : 'text-slate-700'}`}>
                        {course.fee.isFree ? '免費' : course.fee.description}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                        報名 {course.quota.enrolled} / 預計 {course.quota.planned}
                    </p>
                </div>
            </div>

            <dl className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                    <span>{formatTimeRange(course)}</span>
                </div>
                <div className="flex items-center gap-2">
                    <CalendarPlus className="h-4 w-4 shrink-0 text-slate-400" />
                    <span>報名 {formatRegistrationRange(course)}</span>
                </div>
                {course.courseName && (
                    <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 shrink-0 text-slate-400" />
                        <span>{course.courseName}</span>
                    </div>
                )}
                {course.eligibility.gradeNames.length > 0 && (
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 shrink-0 text-slate-400" />
                        <span>{course.eligibility.gradeNames.join('、')}</span>
                    </div>
                )}
            </dl>

            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                {course.urls?.prospectus && (
                    <a
                        href={course.urls.prospectus}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
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
                    className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                    <CalendarPlus className="h-4 w-4" />
                    加入日曆
                </a>

                <RegistrationCalendarButton course={course} />
            </div>
        </article>
    );
}
