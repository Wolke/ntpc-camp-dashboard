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
                    <div key={i} className="animate-pulse rounded-lg border border-slate-200 bg-white p-4">
                        <div className="mb-2 h-4 w-1/3 rounded bg-slate-200"></div>
                        <div className="mb-3 h-6 w-2/3 rounded bg-slate-200"></div>
                        <div className="mb-2 h-3 w-1/2 rounded bg-slate-200"></div>
                        <div className="h-3 w-1/4 rounded bg-slate-200"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (courses.length === 0) {
        return (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
                <p className="mb-2 text-lg font-medium text-slate-700">沒有符合條件的課程</p>
                <p className="text-sm text-slate-400">請調整篩選條件或搜尋關鍵字</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {courses.map((course, index) => (
                <CourseCard key={`${course.schoolName}-${course.category}-${index}`} course={course} />
            ))}
        </div>
    );
}
