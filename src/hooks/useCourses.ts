import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCourseStore } from '../store/courseStore';
import type { CourseData } from '../types/course';

// 載入課程資料
async function fetchCourses(): Promise<CourseData> {
    const response = await fetch('/ntpc-camp-dashboard/data/courses.json');
    if (!response.ok) {
        throw new Error('Failed to fetch courses');
    }
    return response.json();
}

export function useCourses() {
    const { setCourses, filteredCourses, isLoading, error, filters, setFilters, resetFilters } = useCourseStore();

    const query = useQuery({
        queryKey: ['courses'],
        queryFn: fetchCourses,
        staleTime: 1000 * 60 * 30, // 30 分鐘
    });

    useEffect(() => {
        if (query.data?.courses) {
            setCourses(query.data.courses);
        }
    }, [query.data, setCourses]);

    return {
        courses: filteredCourses,
        allCourses: query.data?.courses || [],
        stats: query.data?.stats,
        lastUpdated: query.data?.lastUpdated,
        isLoading: query.isLoading || isLoading,
        error: (query.error as Error)?.message || error,
        filters,
        setFilters,
        resetFilters,
    };
}
