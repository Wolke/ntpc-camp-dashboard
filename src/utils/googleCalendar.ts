import type { Course } from '../types/course';
import { getCourseProspectusUrl } from './courseUtils';

function formatGoogleDate(date: Date) {
    return date.toISOString().replace(/[-:]|\.\d{3}/g, '');
}

function formatRegistrationRange(course: Course) {
    const options: Intl.DateTimeFormatOptions = {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    };
    const start = course.registration?.startTime
        ? new Date(course.registration.startTime).toLocaleString('zh-TW', options)
        : '未提供';
    const end = course.registration?.endTime
        ? new Date(course.registration.endTime).toLocaleString('zh-TW', options)
        : '未提供';

    return `${start} - ${end}`;
}

function buildDetails(course: Course, extraLines: string[] = []) {
    const prospectusUrl = getCourseProspectusUrl(course);

    return [
        ...extraLines,
        `學校/單位：${course.schoolName}`,
        course.campName ? `營隊：${course.campName}` : '',
        course.courseName ? `類別：${course.courseName}` : '',
        `課程日期：${course.schedule.startDate} - ${course.schedule.endDate}`,
        `報名期間：${formatRegistrationRange(course)}`,
        `費用：${course.fee.description || (course.fee.isFree ? '免費' : '未提供')}`,
        course.urls?.registration ? `報名入口：${course.urls.registration}` : '',
        prospectusUrl ? `活動簡章：${prospectusUrl}` : '',
    ].filter(Boolean).join('\n');
}

function buildGoogleCalendarUrl(params: {
    title: string;
    dates: string;
    details: string;
    location?: string;
}) {
    const query = new URLSearchParams({
        action: 'TEMPLATE',
        text: params.title,
        dates: params.dates,
        details: params.details,
        location: params.location || '',
    });

    return `https://calendar.google.com/calendar/render?${query.toString()}`;
}

export function buildCourseCalendarUrl(course: Course) {
    const title = course.category || course.courseName || '育樂營課程';
    const start = course.schedule.startDate?.replace(/-/g, '') || '';
    const inclusiveEnd = course.schedule.endDate || course.schedule.startDate;
    const endDate = inclusiveEnd ? new Date(`${inclusiveEnd}T00:00:00Z`) : null;
    if (endDate) endDate.setUTCDate(endDate.getUTCDate() + 1);
    const end = endDate && !Number.isNaN(endDate.getTime())
        ? endDate.toISOString().slice(0, 10).replace(/-/g, '')
        : start;

    return buildGoogleCalendarUrl({
        title,
        dates: `${start}/${end}`,
        details: buildDetails(course),
        location: course.schoolName,
    });
}

export function buildRegistrationReminderCalendarUrl(course: Course) {
    const registrationStart = course.registration?.startTime
        ? new Date(course.registration.startTime)
        : null;
    const registrationEnd = course.registration?.endTime
        ? new Date(course.registration.endTime)
        : null;
    const reminderStart = registrationStart && !Number.isNaN(registrationStart.getTime())
        ? registrationStart
        : registrationEnd;

    if (!reminderStart || Number.isNaN(reminderStart.getTime())) {
        return null;
    }

    const reminderEnd = new Date(reminderStart.getTime() + 30 * 60 * 1000);
    const title = `報名提醒：${course.category || course.courseName || '育樂營課程'}`;

    return buildGoogleCalendarUrl({
        title,
        dates: `${formatGoogleDate(reminderStart)}/${formatGoogleDate(reminderEnd)}`,
        details: buildDetails(course, ['提醒：這個活動開放報名，請確認名額與報名入口。']),
        location: course.schoolName,
    });
}
