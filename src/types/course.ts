// 課程資料類型定義

export interface CourseSchedule {
    startDate: string;
    endDate: string;
    weekday: string;
    startTime: string;
    endTime: string;
}

export interface CourseFee {
    amount: number;
    isFree: boolean;
    description: string;
}

export interface CourseEligibility {
    grades: number[];
    gradeNames: string[];
    allowExternalStudents: boolean;
    restrictions: string[];
}

export interface CourseQuota {
    enrolled: number;
    planned: number;
    actual: number;
    isLottery: boolean;
}

export interface CourseRegistration {
    method: string;
    canRegister: boolean;
    canWithdraw: boolean;
    startTime: string;
    endTime: string;
    lotteryTime: string;
    isLottery: boolean;
    status: string;
}

// 來源資訊
export interface CourseSource {
    type: 'ntpc_camp' | 'taipei_holiday' | 'beclass' | 'museum' | 'other';
    name: string;
    url: string;
    schoolId?: string;
    actId?: string;
    courseId?: string;
}

// 課程連結
export interface CourseUrls {
    detail?: string;
    prospectus?: string;
    registration?: string;
    external?: string;
}

export interface Course {
    source?: CourseSource;
    school: string;
    schoolName: string;
    campName: string;
    originalSchool: string;
    address: string;
    category: string;
    courseName: string;
    teacher: string;
    schedule: CourseSchedule;
    fee: CourseFee;
    eligibility: CourseEligibility;
    quota: CourseQuota;
    registration: CourseRegistration;
    urls?: CourseUrls;
    tags?: string[];
    _raw: Record<string, string>;
}

export interface CourseData {
    lastUpdated: string;
    stats: {
        total: number;
        allowExternalStudents: number;
        free: number;
        canRegister: number;
        schools: number;
    };
    courses: Course[];
}

// 課程狀態類型
export type RegistrationStatus = 'available' | 'closing_soon' | 'closed' | 'not_started';
export type CourseTimeStatus = 'upcoming' | 'ongoing' | 'ended';
export type QuotaStatus = 'available' | 'almost_full' | 'full' | 'may_not_open';

export interface CourseStatus {
    registration: RegistrationStatus;
    courseTime: CourseTimeStatus;
    quota: QuotaStatus;
}

// 篩選選項
export interface FilterOptions {
    searchQuery: string;
    schoolTypes: ('high_school' | 'junior_high' | 'elementary')[];
    isFree: boolean | null;
    allowExternalStudents: boolean | null; // 是否允許外校生
    dateRange: { start: string | null; end: string | null };
    grades: number[];
    themeIds: string[];
    durationDays: number[];
    registrationStatus: RegistrationStatus[];
    courseTimeStatus: CourseTimeStatus[];
    quotaStatus: QuotaStatus[];
}

// AI 推薦
export interface CourseFeature {
    courseIndex: number;
    tags: string[];
    recommendation: string;
    category: string;
}
