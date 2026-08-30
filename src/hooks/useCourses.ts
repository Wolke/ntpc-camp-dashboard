import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCourseStore } from '../store/courseStore';
import type { Course, CourseData } from '../types/course';
import { applyCourseFilters } from '../utils/courseFilters';

const EMPTY_COURSES: Course[] = [];

// 載入課程資料
async function fetchCourses(): Promise<CourseData> {
    const response = await fetch(`${import.meta.env.BASE_URL}data/courses.json`, {
        cache: 'no-cache',
    });
    if (!response.ok) {
        throw new Error('Failed to fetch courses');
    }
    return response.json();
}

export function useCourses() {
    const { filters, selectedSchool, setFilters, resetFilters } = useCourseStore();

    const query = useQuery({
        queryKey: ['courses'],
        queryFn: fetchCourses,
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: true,
    });

    const allCourses = query.data?.courses ?? EMPTY_COURSES;
    const courses = useMemo(
        () => applyCourseFilters(allCourses, filters, selectedSchool),
        [allCourses, filters, selectedSchool],
    );

    return {
        courses,
        allCourses,
        stats: query.data?.stats,
        lastUpdated: query.data?.lastUpdated,
        isLoading: query.isLoading,
        error: (query.error as Error)?.message,
        filters,
        setFilters,
        resetFilters,
    };
}
