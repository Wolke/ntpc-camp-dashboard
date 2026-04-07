import type { Course } from '../../types/course';
import { getCourseStatusInfo, formatTimeRange, getSchoolTypeLabel } from '../../utils/courseUtils';

interface CourseCardProps {
    course: Course;
    onClick?: () => void;
}

export default function CourseCard({ course, onClick }: CourseCardProps) {
    const status = getCourseStatusInfo(course);

    return (
        <div
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={onClick}
        >
            {/* 頂部：學校與類型 */}
            <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                    <span className="inline-block px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full mr-2">
                        {getSchoolTypeLabel(course.schoolName)}
                    </span>
                    <h3 className="font-semibold text-gray-900 mt-1">{course.schoolName}</h3>
                </div>
            </div>

            {/* 課程名稱 */}
            <p className="text-lg font-bold text-gray-800 mb-2">{course.category}</p>

            {/* 時間 */}
            <div className="flex items-center text-sm text-gray-600 mb-2">
                <span className="mr-2">📅</span>
                <span>{formatTimeRange(course)}</span>
            </div>

            {/* 地址 */}
            {course.address && (
                <div className="flex items-center text-sm text-gray-500 mb-2">
                    <span className="mr-2">📍</span>
                    <span className="truncate">{course.address}</span>
                </div>
            )}

            {/* 報名日期 */}
            {course.registration?.startTime && (
                <div className="flex items-center text-sm text-gray-600 mb-3">
                    <span className="mr-2">📝</span>
                    <span>
                        報名期間：{new Date(course.registration.startTime).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}
                        ~ {new Date(course.registration.endTime).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}
                    </span>
                </div>
            )}

            {/* 狀態徽章區 */}
            <div className="flex flex-wrap gap-2 mb-3">
                {/* 報名狀態 */}
                <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${status.registrationColor}`}>
                    {status.registrationIcon} {status.registrationLabel}
                    {status.daysLeft !== null && status.daysLeft <= 7 && (
                        <span className="ml-1">({status.daysLeft}天)</span>
                    )}
                </span>

                {/* 課程狀態 */}
                <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${status.courseTimeColor}`}>
                    {status.courseTimeIcon} {status.courseTimeLabel}
                </span>

                {/* 名額狀態 */}
                <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${status.quotaColor}`}>
                    {status.quotaIcon} {status.quotaLabel}
                </span>
            </div>

            {/* 費用與報名人數 */}
            <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100">
                <span className={course.fee.isFree ? 'text-green-600 font-semibold' : 'text-gray-700'}>
                    {course.fee.isFree ? '🎉 免費' : `💰 ${course.fee.description}`}
                </span>
                <span className="text-gray-500">
                    報名 {course.quota.enrolled} 人 / 預計 {course.quota.planned} 人
                </span>
            </div>

            {/* 簡章連結 */}
            {course.urls?.prospectus && (
                <div className="mt-3 pt-2 border-t border-gray-100">
                    <a
                        href={course.urls.prospectus}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                        📄 查看活動簡章
                    </a>
                </div>
            )}

            {/* Google 行事曆 & Tasks */}
            <div className="mt-2 flex flex-wrap gap-2">
                {/* 加入 Google 行事曆 (課程日期) */}
                <a
                    href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(course.courseName || course.category)}&dates=${course.schedule.startDate?.replace(/-/g, '')}/${course.schedule.endDate?.replace(/-/g, '')}&details=${encodeURIComponent(`學校: ${course.schoolName}\n營隊: ${course.campName}\n費用: ${course.fee.description || '免費'}`)}&location=${encodeURIComponent(course.schoolName || '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                >
                    📅 加入行事曆
                </a>

                {/* 加入 Google Tasks (報名待辦) */}
                <a
                    href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`[報名] ${course.courseName || course.category}`)}&dates=${course.registration.startTime ? new Date(course.registration.startTime).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z' : ''}/${course.registration.endTime ? new Date(course.registration.endTime).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z' : ''}&details=${encodeURIComponent(`報名期間提醒\n學校: ${course.schoolName}\n課程: ${course.courseName || course.category}\n報名連結: ${course.urls?.registration || 'https://camp.ntpc.edu.tw/'}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-50 text-green-600 rounded hover:bg-green-100"
                >
                    ✅ 報名提醒
                </a>
            </div>
        </div>
    );
}
