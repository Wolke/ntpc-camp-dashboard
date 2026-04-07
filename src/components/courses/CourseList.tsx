import type { Course } from '../../types/course';
import CourseCard from './CourseCard';

interface CourseListProps {
    courses: Course[];
    isLoading?: boolean;
}

export default function CourseList({ courses, isLoading }: CourseListProps) {
    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                        <div className="h-6 bg-gray-200 rounded w-2/3 mb-3"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (courses.length === 0) {
        return (
            <div className="bg-white rounded-xl p-8 text-center">
                <p className="text-gray-500 text-lg mb-2">😔 沒有符合條件的課程</p>
                <p className="text-gray-400 text-sm">請調整篩選條件或搜尋關鍵字</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <p className="text-sm text-gray-500 px-1">
                找到 <span className="font-semibold text-gray-700">{courses.length}</span> 門課程
            </p>
            {courses.map((course, index) => (
                <CourseCard key={`${course.schoolName}-${course.category}-${index}`} course={course} />
            ))}
        </div>
    );
}
