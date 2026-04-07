import { create } from 'zustand';
import type { Course, FilterOptions, CourseFeature, RegistrationStatus, CourseTimeStatus, QuotaStatus } from '../types/course';

interface CourseStore {
    // 資料
    courses: Course[];
    filteredCourses: Course[];
    isLoading: boolean;
    error: string | null;

    // 篩選
    filters: FilterOptions;
    selectedSchool: string | null;

    // AI 推薦
    aiRecommendations: CourseFeature[];
    isLoadingAI: boolean;

    // Actions
    setCourses: (courses: Course[]) => void;
    setFilters: (filters: Partial<FilterOptions>) => void;
    setSelectedSchool: (school: string | null) => void;
    setAIRecommendations: (recommendations: CourseFeature[]) => void;
    applyFilters: () => void;
    resetFilters: () => void;
}

const defaultFilters: FilterOptions = {
    searchQuery: '',
    schoolTypes: [],
    isFree: null,
    allowExternalStudents: null, // 預設不篩選
    dateRange: { start: null, end: null },
    grades: [],
    registrationStatus: ['available', 'closing_soon'], // 預設只顯示可報名
    courseTimeStatus: ['upcoming', 'ongoing'], // 預設只顯示未結束
    quotaStatus: ['available', 'almost_full'], // 預設只顯示有名額
};

// 計算課程狀態
export function getCourseStatus(course: Course, now: Date): {
    registration: RegistrationStatus;
    courseTime: CourseTimeStatus;
    quota: QuotaStatus;
} {
    // 報名狀態
    const regEnd = new Date(course.registration.endTime);
    const regStart = new Date(course.registration.startTime);
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    let registration: RegistrationStatus = 'closed';
    if (now < regStart) {
        registration = 'not_started';
    } else if (now > regEnd) {
        registration = 'closed';
    } else if (regEnd < threeDaysLater) {
        registration = 'closing_soon';
    } else {
        registration = 'available';
    }

    // 課程時間狀態
    const courseStart = new Date(course.schedule.startDate);
    const courseEnd = new Date(course.schedule.endDate);

    let courseTime: CourseTimeStatus = 'ended';
    if (now < courseStart) {
        courseTime = 'upcoming';
    } else if (now <= courseEnd) {
        courseTime = 'ongoing';
    } else {
        courseTime = 'ended';
    }

    // 名額狀態
    const { enrolled, planned, actual } = course.quota;
    let quota: QuotaStatus = 'available';

    if (actual >= planned && planned > 0) {
        quota = 'full';
    } else if (planned > 0 && planned - actual <= 3) {
        quota = 'almost_full';
    } else if (enrolled < 5 && planned > 0) { // 報名人數太少可能不開班
        quota = 'may_not_open';
    } else {
        quota = 'available';
    }

    return { registration, courseTime, quota };
}

// 判斷學校類型
export function getSchoolType(schoolName: string | undefined): 'high_school' | 'junior_high' | 'elementary' {
    if (!schoolName) return 'high_school';
    if (schoolName.includes('國民小學') || schoolName.includes('國小')) {
        return 'elementary';
    } else if (schoolName.includes('國民中學') || schoolName.includes('國中')) {
        return 'junior_high';
    }
    return 'high_school';
}

export const useCourseStore = create<CourseStore>((set, get) => ({
    courses: [],
    filteredCourses: [],
    isLoading: false,
    error: null,
    filters: defaultFilters,
    selectedSchool: null,
    aiRecommendations: [],
    isLoadingAI: false,

    setCourses: (courses) => {
        set({ courses, filteredCourses: courses });
        get().applyFilters();
    },

    setFilters: (newFilters) => {
        set((state) => ({
            filters: { ...state.filters, ...newFilters }
        }));
        get().applyFilters();
    },

    setSelectedSchool: (school) => {
        set({ selectedSchool: school });
        get().applyFilters();
    },

    setAIRecommendations: (recommendations) => {
        set({ aiRecommendations: recommendations });
    },

    applyFilters: () => {
        const { courses, filters, selectedSchool } = get();
        const now = new Date();

        const filtered = courses.filter((course) => {
            // 搜尋文字
            if (filters.searchQuery) {
                const query = filters.searchQuery.toLowerCase();
                const searchFields = [
                    course.school,
                    course.schoolName,
                    course.campName,
                    course.category,
                    course.courseName,
                    course.teacher,
                    course.address,
                ].join(' ').toLowerCase();

                if (!searchFields.includes(query)) {
                    return false;
                }
            }

            // 選中的學校
            if (selectedSchool && course.schoolName !== selectedSchool) {
                return false;
            }

            // 學校類型
            if (filters.schoolTypes.length > 0) {
                const schoolType = getSchoolType(course.schoolName);
                if (!filters.schoolTypes.includes(schoolType)) {
                    return false;
                }
            }

            // 費用
            if (filters.isFree !== null) {
                if (filters.isFree !== course.fee.isFree) {
                    return false;
                }
            }

            // 年級
            if (filters.grades.length > 0) {
                const hasMatchingGrade = filters.grades.some(g => course.eligibility.grades.includes(g));
                if (!hasMatchingGrade) {
                    return false;
                }
            }

            // 外校生篩選
            if (filters.allowExternalStudents === true) {
                if (!course.eligibility.allowExternalStudents) {
                    return false;
                }
            }

            // 日期範圍篩選
            if (filters.dateRange.start || filters.dateRange.end) {
                const courseStart = course.schedule.startDate;
                const courseEnd = course.schedule.endDate;

                if (filters.dateRange.start && courseStart) {
                    if (courseStart < filters.dateRange.start) {
                        return false;
                    }
                }
                if (filters.dateRange.end && courseEnd) {
                    if (courseEnd > filters.dateRange.end) {
                        return false;
                    }
                }
            }

            // 狀態篩選
            const status = getCourseStatus(course, now);

            if (filters.registrationStatus.length > 0) {
                if (!filters.registrationStatus.includes(status.registration)) {
                    return false;
                }
            }

            if (filters.courseTimeStatus.length > 0) {
                if (!filters.courseTimeStatus.includes(status.courseTime)) {
                    return false;
                }
            }

            if (filters.quotaStatus.length > 0) {
                if (!filters.quotaStatus.includes(status.quota)) {
                    return false;
                }
            }

            return true;
        });

        set({ filteredCourses: filtered });
    },

    resetFilters: () => {
        set({ filters: defaultFilters, selectedSchool: null });
        get().applyFilters();
    },
}));
