import type { Course } from '../types/course';

export function makeCourse(overrides: Partial<Course> = {}): Course {
    const base: Course = {
        source: {
            type: 'ntpc_camp',
            name: '新北市寒暑假育樂營',
            url: 'https://camp.ntpc.edu.tw/',
            schoolId: '001',
            actId: '001',
            courseId: '001',
        },
        school: '測試國小',
        schoolName: '測試國民小學',
        campName: '測試營隊',
        originalSchool: '測試國民小學',
        address: '新北市',
        category: '足球活動',
        courseName: '體育類',
        teacher: '測試老師',
        schedule: {
            startDate: '2026-09-10',
            endDate: '2026-09-12',
            weekday: '週四',
            startTime: '09:00',
            endTime: '12:00',
        },
        fee: { amount: 0, isFree: true, description: '免費' },
        eligibility: {
            grades: [3, 4, 5, 6],
            gradeNames: ['三年級', '四年級', '五年級', '六年級'],
            allowExternalStudents: true,
            restrictions: [],
        },
        quota: { enrolled: 0, planned: 20, actual: 0, isLottery: false },
        registration: {
            method: '線上報名',
            canRegister: true,
            canWithdraw: true,
            startTime: '2026-08-01T09:00:00+08:00',
            endTime: '2026-09-20T17:00:00+08:00',
            lotteryTime: '',
            isLottery: false,
            status: '開放報名',
        },
        urls: { detail: 'https://camp.ntpc.edu.tw/course/001' },
        tags: [],
        _raw: {},
    };

    return {
        ...base,
        ...overrides,
        source: { ...base.source!, ...overrides.source },
        schedule: { ...base.schedule, ...overrides.schedule },
        fee: { ...base.fee, ...overrides.fee },
        eligibility: { ...base.eligibility, ...overrides.eligibility },
        quota: { ...base.quota, ...overrides.quota },
        registration: { ...base.registration, ...overrides.registration },
        urls: { ...base.urls, ...overrides.urls },
        _raw: { ...base._raw, ...overrides._raw },
    };
}
