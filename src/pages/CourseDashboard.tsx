import { useCourses } from '../hooks/useCourses';
import SearchBar from '../components/courses/SearchBar';
import StatusFilter from '../components/courses/StatusFilter';
import DateRangeSlider from '../components/courses/DateRangeSlider';
import SchoolMap from '../components/courses/SchoolMap';
import CourseList from '../components/courses/CourseList';
import { useCourseStore } from '../store/courseStore';

export default function CourseDashboard() {
    const { courses, stats, lastUpdated, isLoading, error } = useCourses();
    const { selectedSchool, setSelectedSchool } = useCourseStore();

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
            <div className="max-w-4xl mx-auto px-4 py-6">
                {/* 標題區 */}
                <header className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">
                        🎓 新北市育樂營課程
                    </h1>
                    <p className="text-sm text-gray-500">
                        {stats && `共 ${stats.total} 門課程，${stats.schools} 所學校`}
                        {lastUpdated && ` · 更新於 ${new Date(lastUpdated).toLocaleDateString('zh-TW')}`}
                    </p>
                </header>

                {/* 搜尋區 */}
                <section className="mb-4">
                    <SearchBar />
                </section>

                {/* 篩選區 */}
                <section className="mb-4">
                    <StatusFilter />
                </section>

                {/* 日期範圍選擇 */}
                <section className="mb-4">
                    <DateRangeSlider courses={courses} />
                </section>

                {/* 地圖區 */}
                <section className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        🗺️ 學校地圖
                        <span className="text-sm font-normal text-gray-500">
                            點擊標記篩選該校課程
                        </span>
                    </h2>
                    <SchoolMap courses={courses} height="280px" />
                </section>

                {/* 選中學校提示 */}
                {selectedSchool && (
                    <div className="mb-4 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 flex items-center justify-between">
                        <span className="text-indigo-700">
                            📍 篩選中：<strong>{selectedSchool}</strong>
                        </span>
                        <button
                            onClick={() => setSelectedSchool(null)}
                            className="text-sm text-indigo-600 hover:underline"
                        >
                            顯示全部
                        </button>
                    </div>
                )}

                {/* 錯誤提示 */}
                {error && (
                    <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700">
                        ❌ 載入錯誤：{error}
                    </div>
                )}

                {/* 課程列表 */}
                <section>
                    <h2 className="text-lg font-semibold text-gray-800 mb-3">
                        📚 課程列表
                    </h2>
                    <CourseList courses={courses} isLoading={isLoading} />
                </section>
            </div>
        </div>
    );
}
