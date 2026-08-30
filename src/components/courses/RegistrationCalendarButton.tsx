import { CalendarClock } from 'lucide-react';
import type { MouseEvent } from 'react';
import type { Course } from '../../types/course';
import { buildRegistrationReminderCalendarUrl } from '../../utils/googleCalendar';

interface RegistrationCalendarButtonProps {
    course: Course;
}

export default function RegistrationCalendarButton({ course }: RegistrationCalendarButtonProps) {
    const reminderUrl = buildRegistrationReminderCalendarUrl(course);

    const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
        event.stopPropagation();
    };

    if (!reminderUrl) {
        return (
            <button
                type="button"
                disabled
                title="這筆課程沒有可用的報名時間"
                className="inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-400"
            >
                <CalendarClock className="h-4 w-4" />
                新增報名通知
            </button>
        );
    }

    return (
        <a
            href={reminderUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            title="新增報名提醒到 Google 日曆"
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
        >
            <CalendarClock className="h-4 w-4" />
            新增報名通知
        </a>
    );
}
