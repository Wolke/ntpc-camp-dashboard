import type { Course } from '../types/course';
import { getCourseStatus, getSchoolType } from '../store/courseStore';

// 狀態標籤顏色
export const statusColors = {
    registration: {
        available: 'bg-green-100 text-green-800 border-green-200',
        closing_soon: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        closed: 'bg-red-100 text-red-800 border-red-200',
        not_started: 'bg-gray-100 text-gray-600 border-gray-200',
    },
    courseTime: {
        upcoming: 'bg-blue-100 text-blue-800 border-blue-200',
        ongoing: 'bg-green-100 text-green-800 border-green-200',
        ended: 'bg-gray-100 text-gray-500 border-gray-200',
    },
    quota: {
        available: 'bg-green-100 text-green-800 border-green-200',
        almost_full: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        full: 'bg-red-100 text-red-800 border-red-200',
        may_not_open: 'bg-orange-100 text-orange-800 border-orange-200',
    },
};

// 狀態標籤文字
export const statusLabels = {
    registration: {
        available: '可報名',
        closing_soon: '即將截止',
        closed: '已截止',
        not_started: '尚未開放',
    },
    courseTime: {
        upcoming: '即將開課',
        ongoing: '進行中',
        ended: '已結束',
    },
    quota: {
        available: '有名額',
        almost_full: '即將額滿',
        full: '已額滿',
        may_not_open: '可能未開班',
    },
};

// 狀態圖示
export const statusIcons = {
    registration: {
        available: '🟢',
        closing_soon: '🟡',
        closed: '🔴',
        not_started: '⚪',
    },
    courseTime: {
        upcoming: '📅',
        ongoing: '▶️',
        ended: '⏹️',
    },
    quota: {
        available: '✅',
        almost_full: '⚠️',
        full: '❌',
        may_not_open: '❓',
    },
};

// 格式化日期
export function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
}

const weekdayOrder = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];
const weekdayByDateIndex = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

interface ScheduleEntry {
    weekday: string;
    startTime: string;
    endTime: string;
}

function isValidDate(date: Date) {
    return !Number.isNaN(date.getTime());
}

function toMinutes(time: string): number | null {
    const match = time.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
}

function normalizeWeekday(weekday: string): string | null {
    const match = weekday.match(/週[一二三四五六日]/);
    return match?.[0] ?? null;
}

function parseRawScheduleEntries(course: Course): ScheduleEntry[] {
    const rawSchedule = course._raw?.schedule ?? '';
    const matches = rawSchedule.matchAll(/(週[一二三四五六日])\s*(\d{1,2}:\d{2})\s*[~～\-－]\s*(\d{1,2}:\d{2})/g);
    const seen = new Set<string>();
    const entries: ScheduleEntry[] = [];

    for (const match of matches) {
        const entry = {
            weekday: match[1],
            startTime: match[2],
            endTime: match[3],
        };
        const key = `${entry.weekday}-${entry.startTime}-${entry.endTime}`;
        if (!seen.has(key)) {
            seen.add(key);
            entries.push(entry);
        }
    }

    return entries;
}

function getDateRangeWeekdays(course: Course): string[] {
    const start = new Date(course.schedule.startDate);
    const end = new Date(course.schedule.endDate);
    if (!isValidDate(start) || !isValidDate(end) || start > end) return [];

    const weekdays = new Set<string>();
    const current = new Date(start);
    const maxDays = 31;
    for (let day = 0; current <= end && day < maxDays; day += 1) {
        weekdays.add(weekdayByDateIndex[current.getDay()]);
        current.setDate(current.getDate() + 1);
    }

    return weekdayOrder.filter((weekday) => weekdays.has(weekday));
}

function getScheduleEntries(course: Course): ScheduleEntry[] {
    const rawEntries = parseRawScheduleEntries(course);
    if (rawEntries.length > 0) return rawEntries;

    const weekday = normalizeWeekday(course.schedule.weekday);
    if (weekday && course.schedule.startTime && course.schedule.endTime) {
        return [{ weekday, startTime: course.schedule.startTime, endTime: course.schedule.endTime }];
    }

    return getDateRangeWeekdays(course).map((rangeWeekday) => ({
        weekday: rangeWeekday,
        startTime: course.schedule.startTime,
        endTime: course.schedule.endTime,
    }));
}

function formatWeekdays(weekdays: string[]): string {
    const sorted = weekdayOrder.filter((weekday) => weekdays.includes(weekday));
    if (sorted.length === 0) return '';
    if (sorted.length === 1) return sorted[0];

    const indexes = sorted.map((weekday) => weekdayOrder.indexOf(weekday));
    const isContinuous = indexes.every((index, itemIndex) => itemIndex === 0 || index === indexes[itemIndex - 1] + 1);
    if (isContinuous) {
        return `${sorted[0]}至${sorted[sorted.length - 1]}`;
    }

    return sorted.join('、');
}

function getPeriodLabel(startTime: string, endTime: string): string | null {
    const start = toMinutes(startTime);
    const end = toMinutes(endTime);
    if (start === null || end === null || end <= start) return null;

    const duration = end - start;
    if ((start <= 10 * 60 && end >= 15 * 60) || duration >= 6 * 60) return '整天';
    if (start < 12 * 60 && end <= 13 * 60) return '上午';
    if (start >= 12 * 60) return '下午';
    return '跨時段';
}

function getRawPeriodLabel(course: Course): string | null {
    const rawSchedule = course._raw?.schedule ?? '';
    const labels = [
        { pattern: /(整天|全天|全日)/, label: '整天' },
        { pattern: /上午/, label: '上午' },
        { pattern: /下午/, label: '下午' },
    ];

    return labels.find(({ pattern }) => pattern.test(rawSchedule))?.label ?? null;
}

function formatPeriodSummary(course: Course, entries: ScheduleEntry[]): string {
    const periods = entries
        .map((entry) => getPeriodLabel(entry.startTime, entry.endTime))
        .filter((period): period is string => Boolean(period));

    const uniquePeriods = ['上午', '下午', '整天', '跨時段'].filter((period) => periods.includes(period));
    if (uniquePeriods.length > 0) return uniquePeriods.join('/');

    return getRawPeriodLabel(course) ?? '';
}

function formatClockSummary(course: Course, entries: ScheduleEntry[]): string {
    const ranges = entries
        .filter((entry) => entry.startTime && entry.endTime)
        .map((entry) => `${entry.startTime}-${entry.endTime}`);
    const uniqueRanges = Array.from(new Set(ranges));

    if (uniqueRanges.length === 1) return uniqueRanges[0];
    if (uniqueRanges.length > 1) return '多時段';
    if (course.schedule.startTime && course.schedule.endTime) return `${course.schedule.startTime}-${course.schedule.endTime}`;
    return '';
}

// 格式化時間範圍
export function formatTimeRange(course: Course): string {
    const { startDate, endDate } = course.schedule;
    const entries = getScheduleEntries(course);
    const weekdaySummary = formatWeekdays(Array.from(new Set(entries.map((entry) => entry.weekday))));
    const periodSummary = formatPeriodSummary(course, entries);
    const clockSummary = formatClockSummary(course, entries);
    const dateRange = startDate === endDate ? formatDate(startDate) : `${formatDate(startDate)} - ${formatDate(endDate)}`;

    return [dateRange, weekdaySummary, periodSummary, clockSummary].filter(Boolean).join(' ');
}

// 計算報名截止剩餘天數
export function getDaysUntilDeadline(course: Course): number | null {
    const now = new Date();
    const deadline = new Date(course.registration.endTime);
    if (now > deadline) return null;
    const diffTime = deadline.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// 獲取學校類型標籤
export function getSchoolTypeLabel(schoolName: string): string {
    const type = getSchoolType(schoolName);
    switch (type) {
        case 'high_school': return '高中職';
        case 'junior_high': return '國中';
        case 'elementary': return '國小';
    }
}

// 獲取完整課程狀態資訊
export function getCourseStatusInfo(course: Course) {
    const now = new Date();
    const status = getCourseStatus(course, now);
    const daysLeft = getDaysUntilDeadline(course);

    return {
        ...status,
        daysLeft,
        registrationLabel: statusLabels.registration[status.registration],
        courseTimeLabel: statusLabels.courseTime[status.courseTime],
        quotaLabel: statusLabels.quota[status.quota],
        registrationColor: statusColors.registration[status.registration],
        courseTimeColor: statusColors.courseTime[status.courseTime],
        quotaColor: statusColors.quota[status.quota],
        registrationIcon: statusIcons.registration[status.registration],
        courseTimeIcon: statusIcons.courseTime[status.courseTime],
        quotaIcon: statusIcons.quota[status.quota],
    };
}
