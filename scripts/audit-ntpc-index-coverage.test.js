import { describe, expect, it } from 'vitest';
import {
    parseActiveActivities,
    parseActivityCourses,
    parseRegistrationPeriod,
    normalizeSchoolActivityCourse
} from '../src/ntpc-school-activity-crawler.js';

describe('parseRegistrationPeriod', () => {
    it('classifies an active registration period in Taipei time', () => {
        expect(parseRegistrationPeriod(
            '報名期間 08/31 12:00 至 09/05 23:00 公告期間 09/06 09:00 至 09/10 16:00',
            new Date('2026-09-03T02:00:00Z')
        )).toEqual({
            registrationStart: '2026-08-31T12:00:00+08:00',
            registrationEnd: '2026-09-05T23:00:00+08:00',
            registrationState: 'open'
        });
    });
});

describe('parseActiveActivities', () => {
    it('extracts public activity identifiers and links', () => {
        const html = `
            <div class="ing_area">
                <div class="sign-up">
                    <div class="class_title">
                        <span class="left_title">
                            <button onclick="showClsList('014773', '00038','all')">115學年度上學期課後社團</button>
                        </span>
                        <span class="taglink">37個課程</span>
                    </div>
                    <span class="day">報名期間 08/31 12:00 至 09/05 23:00</span>
                </div>
            </div>`;

        const [activity] = parseActiveActivities(html, {
            schoolId: '014773',
            schoolName: '新北市土城區樂利國民小學',
            areaId: '1'
        }, new Date('2026-09-03T02:00:00Z'));

        expect(activity).toMatchObject({
            schoolId: '014773',
            activityId: '00038',
            activityName: '115學年度上學期課後社團',
            courseCount: 37,
            registrationState: 'open'
        });
        expect(activity.url).toContain('ACTOutIndex_ClsList');
        expect(activity.url).toContain('schno=014773');
    });
});

describe('parseActivityCourses', () => {
    it('detects courses that explicitly allow external students', () => {
        const html = `
            <div class="list color1" role="row">
                <button class="cls-detail-btn" onclick="showClsDetail('014796', '00056', '001');">
                    圍棋社
                </button>
                <span class="every_years">1,2,3,4,5,6,外校學生- 限制本縣市學生</span>
            </div>
            <div class="list color1" role="row">
                <button class="cls-detail-btn" onclick="showClsDetail('014796', '00056', '002');">
                    校隊
                </button>
                <span class="every_years">3,4,5,6</span>
            </div>`;

        expect(parseActivityCourses(html)).toMatchObject([
            {
                schoolId: '014796',
                activityId: '00056',
                courseId: '001',
                courseName: '圍棋社',
                eligibility: '1,2,3,4,5,6,外校學生- 限制本縣市學生',
                allowExternalStudents: true
            },
            {
                schoolId: '014796',
                activityId: '00056',
                courseId: '002',
                courseName: '校隊',
                eligibility: '3,4,5,6',
                allowExternalStudents: false
            }
        ]);
    });
});

describe('normalizeSchoolActivityCourse', () => {
    it('creates a dashboard course with public-source provenance and restrictions', () => {
        const activity = {
            schoolId: '014796',
            schoolName: '新北市中和區光復國民小學',
            activityId: '00056',
            activityName: '115學年度上學期課後社團',
            selectionSummary: '依課程抽籤 (第1階段)',
            registrationSummary: '報名期間 09/02 09:00 至 09/04 16:00',
            registrationStart: '2026-09-02T09:00:00+08:00',
            registrationEnd: '2026-09-04T16:00:00+08:00',
            url: 'https://camp.ntpc.edu.tw/public-course-list'
        };
        const course = {
            schoolId: '014796',
            activityId: '00056',
            courseId: '001',
            courseName: '圍棋社 學費：2600元',
            teacher: '名人圍棋師資',
            scheduleEntries: ['週一 16:10~17:40'],
            feeText: '無',
            eligibility: '1,2,3,4,5,6,外校學生- 限制本縣市學生',
            quotaText: '18 (10)',
            admittedText: '0 (0)',
            enrolledText: '7',
            statusText: '報名中'
        };
        const detail = {
            clsname: '圍棋社 學費：2600元',
            clsbgndate_desc: '115/09/14',
            clsenddate_desc: '115/12/28',
            clstimes_period_desc: [{ week_desc: '週一', time_desc: '16:10~17:40' }],
            tealist: '教師：名人圍棋師資',
            placename: '光復國小',
            clsfile_exist: 'true',
            clsfile_path: '/central/014796/course.pdf'
        };

        const normalized = normalizeSchoolActivityCourse(
            course,
            activity,
            detail,
            new Date('2026-09-03T02:00:00Z')
        );

        expect(normalized).toMatchObject({
            source: {
                type: 'ntpc_school_activity',
                schoolId: '014796',
                actId: '00056',
                courseId: '001',
                visibility: 'school_page_only'
            },
            category: '圍棋社',
            schedule: {
                startDate: '2026-09-14',
                endDate: '2026-12-28',
                weekday: '週一',
                startTime: '16:10',
                endTime: '17:40'
            },
            fee: { amount: 2600, isFree: false },
            eligibility: {
                allowExternalStudents: true,
                restrictions: ['限制本縣市學生']
            },
            quota: { enrolled: 7, planned: 18, actual: 0, isLottery: true },
            registration: { canRegister: true, status: '可報名', isLottery: true }
        });
        expect(normalized.urls.prospectus).toBe('https://camp.ntpc.edu.tw/central/014796/course.pdf');
    });

    it('keeps school-only courses and labels them without changing eligibility', () => {
        const normalized = normalizeSchoolActivityCourse({
            schoolId: '014773',
            activityId: '00038',
            courseId: '002',
            courseName: '校隊',
            teacher: '',
            scheduleEntries: ['週三 16:00~17:00'],
            feeText: '免費',
            eligibility: '3,4,5,6',
            allowExternalStudents: false,
            quotaText: '20',
            admittedText: '0',
            enrolledText: '5',
            statusText: '報名中'
        }, {
            schoolName: '新北市土城區樂利國民小學',
            activityName: '115學年度上學期課後社團',
            selectionSummary: '依報名順序錄取',
            registrationSummary: '報名期間 09/02 09:00 至 09/04 16:00',
            registrationStart: '2026-09-02T09:00:00+08:00',
            registrationEnd: '2026-09-04T16:00:00+08:00',
            url: 'https://camp.ntpc.edu.tw/public-course-list'
        }, {}, new Date('2026-09-03T02:00:00Z'));

        expect(normalized.eligibility.allowExternalStudents).toBe(false);
        expect(normalized.tags).toContain('限本校');
        expect(normalized.tags).not.toContain('開放外校');
    });
});
