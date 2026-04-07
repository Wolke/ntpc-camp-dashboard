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

// 格式化時間範圍
export function formatTimeRange(course: Course): string {
    const { startDate, endDate, startTime, endTime, weekday } = course.schedule;
    const weekdayStr = weekday ? `(${weekday})` : '';
    if (startDate === endDate) {
        return `${formatDate(startDate)} ${weekdayStr} ${startTime}-${endTime}`.replace(/\s+/g, ' ').trim();
    }
    return `${formatDate(startDate)} - ${formatDate(endDate)} ${weekdayStr} ${startTime}-${endTime}`.replace(/\s+/g, ' ').trim();
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
