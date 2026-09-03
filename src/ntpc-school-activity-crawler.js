/**
 * Discover public school activities that are not included in Camp's global
 * index, and normalize every publicly listed course.
 *
 * Only anonymous public pages are read. Student and registration records are
 * never requested.
 */

import * as cheerio from 'cheerio';
import {
    parseEligibility,
    parseFee,
    parseSchedule
} from './utils.js';

export const NTPC_BASE_URL = 'https://camp.ntpc.edu.tw';
const ACTION_URL = `${NTPC_BASE_URL}/jsp/act_register/ACTMangAction.do`;
const SCHOOL_ACTIVITY_URL = `${NTPC_BASE_URL}/jsp/act_register/ACTOutIndexAction.do`;
const AREA_IDS = [
    'other',
    '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
    '11', '12', '13', '15', '16', '17', '18', '19', '20',
    '21', '22', '23', '24', '25', '26', '27', '28', '29', '83'
];
const USER_AGENT = 'ntpc-camp-dashboard-public-school-crawler/1.0';

function textWithoutLabels($, element, labels) {
    const clone = $(element).clone();
    clone.find(labels).remove();
    return clone.text().replace(/\s+/g, ' ').trim();
}

function taipeiYear(now) {
    return Number(
        new Intl.DateTimeFormat('en', { timeZone: 'Asia/Taipei', year: 'numeric' }).format(now)
    );
}

function toAbsoluteUrl(path) {
    if (!path) return '';
    return new URL(path, NTPC_BASE_URL).toString();
}

export function parseRegistrationPeriod(summary, now = new Date()) {
    const match = summary.match(
        /報名期間\s*(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})\s*至\s*(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})/
    );
    if (!match) return { registrationStart: null, registrationEnd: null, registrationState: 'unknown' };

    const toIso = (year, month, day, hour, minute) =>
        `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute}:00+08:00`;

    let startYear = taipeiYear(now);
    let registrationStart = toIso(startYear, match[1], match[2], match[3], match[4]);
    if (new Date(registrationStart).getTime() - now.getTime() > 183 * 24 * 60 * 60 * 1000) {
        startYear -= 1;
        registrationStart = toIso(startYear, match[1], match[2], match[3], match[4]);
    }

    const crossesYear = Number(match[5]) < Number(match[1]);
    const registrationEnd = toIso(startYear + (crossesYear ? 1 : 0), match[5], match[6], match[7], match[8]);
    const nowTime = now.getTime();
    const startTime = new Date(registrationStart).getTime();
    const endTime = new Date(registrationEnd).getTime();
    const registrationState = nowTime < startTime ? 'upcoming' : nowTime <= endTime ? 'open' : 'closed';

    return { registrationStart, registrationEnd, registrationState };
}

export function parseActiveActivities(html, school, now = new Date()) {
    const $ = cheerio.load(html);
    const activities = [];

    $('.ing_area .sign-up').each((_, element) => {
        const button = $(element).find('.left_title button[onclick*="showClsList"]').first();
        const onclick = button.attr('onclick') ?? '';
        const ids = onclick.match(/showClsList\('([^']+)',\s*'([^']+)'/);
        if (!ids) return;

        const activityId = ids[2];
        const tags = $(element).find('.class_title .taglink')
            .map((__, tag) => $(tag).text().replace(/\s+/g, ' ').trim())
            .get();
        const registrationSummary = $(element).find('.day').text().replace(/\s+/g, ' ').trim();

        activities.push({
            schoolId: ids[1],
            schoolName: school.schoolName,
            areaId: school.areaId,
            activityId,
            activityName: button.text().replace(/\s+/g, ' ').trim(),
            courseCount: Number.parseInt(tags[0], 10) || 0,
            selectionSummary: tags.slice(1).join('、'),
            registrationSummary,
            ...parseRegistrationPeriod(registrationSummary, now),
            url: `${SCHOOL_ACTIVITY_URL}?${new URLSearchParams({
                method: 'ACTOutIndex_ClsList',
                schno: ids[1],
                actmang_no: activityId,
                week_filter: 'all',
                filter_mycourse: 'false'
            })}`
        });
    });

    return activities;
}

export function parseActivityCourses(html) {
    const $ = cheerio.load(html);
    const courses = [];

    $('.list[role="row"] .cls-detail-btn').each((_, buttonElement) => {
        const button = $(buttonElement);
        const row = button.closest('.list[role="row"]');
        const onclick = button.attr('onclick') ?? '';
        const ids = onclick.match(/showClsDetail\('([^']+)',\s*'([^']+)',\s*'([^']+)'/);
        if (!ids) return;

        const eligibility = row.find('.every_years').text().replace(/\s+/g, ' ').trim();
        const scheduleEntries = row.find('.every_week')
            .map((__, entry) => $(entry).text().replace(/\s+/g, ' ').trim())
            .get();

        courses.push({
            schoolId: ids[1],
            activityId: ids[2],
            courseId: ids[3],
            courseName: button.text().replace(/\s+/g, ' ').trim(),
            teacher: textWithoutLabels($, row.find('.list_teacher'), '.phone_title'),
            scheduleEntries,
            feeText: textWithoutLabels($, row.find('.list_fee'), '.phone_title'),
            eligibility,
            allowExternalStudents: eligibility.includes('外校學生'),
            quotaText: textWithoutLabels($, row.find('.list_open'), '.content_icon, .side_title'),
            admittedText: textWithoutLabels($, row.find('.list_in'), '.content_icon, .side_title'),
            enrolledText: textWithoutLabels($, row.find('.list_last'), '.content_icon, .side_title'),
            statusText: row.find('.list_status').text().replace(/\s+/g, ' ').trim()
        });
    });

    return courses;
}

function parseCountPair(value) {
    const match = value.match(/(\d+)\s*(?:\((\d+)\))?/);
    return {
        primary: match ? Number.parseInt(match[1], 10) : 0,
        secondary: match?.[2] ? Number.parseInt(match[2], 10) : 0
    };
}

function parseCourseFee(course) {
    const embeddedFee = course.courseName.match(/(?:學費|費用)\s*[：:]\s*\$?\s*([\d,]+)\s*元?/);
    if (embeddedFee) {
        return parseFee(`${embeddedFee[1].replaceAll(',', '')}元`);
    }
    if (/\d/.test(course.feeText)) return parseFee(course.feeText);
    return parseFee(course.feeText === '無' ? '免費' : course.feeText);
}

function cleanCourseName(name) {
    return name
        .replace(/\s*(?:學費|費用)\s*[：:]\s*\$?\s*[\d,]+\s*元?\s*$/u, '')
        .trim();
}

function buildRegistration(activity, statusText, now) {
    const currentTime = now.getTime();
    const startTime = activity.registrationStart ? new Date(activity.registrationStart).getTime() : Number.NaN;
    const endTime = activity.registrationEnd ? new Date(activity.registrationEnd).getTime() : Number.NaN;
    const inRegistrationPeriod = Number.isFinite(startTime)
        && Number.isFinite(endTime)
        && currentTime >= startTime
        && currentTime <= endTime;
    const isFull = /額滿/.test(statusText);

    let status = '未知';
    if (Number.isFinite(startTime) && currentTime < startTime) status = '尚未開放';
    else if (Number.isFinite(endTime) && currentTime > endTime) status = '已截止';
    else if (isFull) status = '額滿';
    else if (inRegistrationPeriod) status = '可報名';

    return {
        method: '網路線上報名',
        canRegister: inRegistrationPeriod && !isFull,
        canWithdraw: activity.registrationSummary.includes('退選'),
        startTime: activity.registrationStart,
        endTime: activity.registrationEnd,
        lotteryTime: null,
        isLottery: activity.selectionSummary.includes('抽籤'),
        status
    };
}

export function normalizeSchoolActivityCourse(course, activity, detail, now = new Date()) {
    const periods = (detail.clstimes_period_desc ?? [])
        .map((period) => `${period.week_desc} ${period.time_desc}`)
        .filter(Boolean);
    const scheduleEntries = periods.length > 0 ? periods : course.scheduleEntries;
    const scheduleRaw = [
        detail.clsbgndate_desc && detail.clsenddate_desc
            ? `${detail.clsbgndate_desc} 至 ${detail.clsenddate_desc}`
            : '',
        ...scheduleEntries
    ].filter(Boolean).join('\n');
    const planned = parseCountPair(course.quotaText);
    const admitted = parseCountPair(course.admittedText);
    const enrolled = Number.parseInt(course.enrolledText.match(/\d+/)?.[0] ?? '0', 10);
    const displayName = cleanCourseName(detail.clsname || course.courseName);
    const attachmentUrl = detail.clsfile_exist === 'true' ? toAbsoluteUrl(detail.clsfile_path) : '';

    return {
        source: {
            type: 'ntpc_school_activity',
            name: '新北市校園活動報名（逐校公開頁）',
            url: activity.url,
            schoolId: course.schoolId,
            actId: course.activityId,
            courseId: course.courseId,
            visibility: 'school_page_only'
        },
        school: `${activity.schoolName} - ${activity.activityName}`,
        schoolName: activity.schoolName,
        campName: activity.activityName,
        originalSchool: `${activity.schoolName} - ${activity.activityName}`,
        address: detail.placename || '',
        category: displayName,
        courseName: activity.activityName,
        teacher: detail.tealist?.replace(/^教師[：:]\s*/, '').trim() || course.teacher,
        schedule: parseSchedule(scheduleRaw),
        fee: parseCourseFee({ ...course, courseName: detail.clsname || course.courseName }),
        eligibility: parseEligibility(course.eligibility),
        quota: {
            enrolled,
            planned: planned.primary,
            actual: admitted.primary,
            isLottery: activity.selectionSummary.includes('抽籤')
        },
        registration: buildRegistration(activity, course.statusText, now),
        urls: {
            detail: activity.url,
            registration: activity.url,
            ...(attachmentUrl ? { prospectus: attachmentUrl } : {})
        },
        tags: [
            course.allowExternalStudents ? '開放外校' : '限本校',
            '未被 Camp 全站索引',
            '逐校公開頁'
        ],
        _raw: {
            schedule: scheduleRaw,
            fee: course.feeText,
            eligibility: course.eligibility,
            quota: `報名人數: ${enrolled} 預計錄取: ${planned.primary} 實際錄取: ${admitted.primary}`,
            status: course.statusText,
            activityRegistration: activity.registrationSummary
        }
    };
}

async function fetchWithRetry(url, options = {}, attempts = 3) {
    let lastError;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'User-Agent': USER_AGENT,
                    ...options.headers
                },
                signal: AbortSignal.timeout(20000)
            });
            if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
            return response;
        } catch (error) {
            lastError = error;
            if (attempt < attempts) {
                await new Promise((resolve) => setTimeout(resolve, attempt * 500));
            }
        }
    }

    throw lastError;
}

async function mapWithConcurrency(items, concurrency, worker) {
    const results = new Array(items.length);
    let nextIndex = 0;

    async function runWorker() {
        while (nextIndex < items.length) {
            const index = nextIndex;
            nextIndex += 1;
            results[index] = await worker(items[index], index);
        }
    }

    await Promise.all(
        Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker())
    );
    return results;
}

async function fetchSchoolDirectory() {
    const schools = new Map();

    for (const areaId of AREA_IDS) {
        const body = new URLSearchParams({
            method: 'ActMang_NTPCCamp',
            status: 'querysch',
            areaid: areaId
        });
        const response = await fetchWithRetry(ACTION_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body
        });
        const payload = await response.json();
        for (const school of payload.sch_list ?? []) {
            schools.set(school.schno, {
                schoolId: school.schno,
                schoolName: school.name,
                areaId
            });
        }
    }

    return [...schools.values()];
}

async function fetchActiveActivities(schools, now, concurrency) {
    const failures = [];
    const batches = await mapWithConcurrency(schools, concurrency, async (school, index) => {
        if ((index + 1) % 50 === 0) {
            console.log(`   已檢查 ${index + 1}/${schools.length} 所學校`);
        }

        try {
            const query = new URLSearchParams({
                method: 'ACTOutIndex_MangList',
                schno: school.schoolId
            });
            const response = await fetchWithRetry(`${SCHOOL_ACTIVITY_URL}?${query}`);
            return parseActiveActivities(await response.text(), school, now);
        } catch (error) {
            failures.push({
                schoolId: school.schoolId,
                schoolName: school.schoolName,
                error: error instanceof Error ? error.message : String(error)
            });
            return [];
        }
    });

    return { activities: batches.flat(), failures };
}

async function fetchUnindexedActivityCourses(activities, concurrency) {
    const failures = [];
    const results = await mapWithConcurrency(activities, concurrency, async (activity, index) => {
        if ((index + 1) % 25 === 0) {
            console.log(`   已解析 ${index + 1}/${activities.length} 個未索引活動`);
        }

        try {
            const response = await fetchWithRetry(activity.url);
            const courses = parseActivityCourses(await response.text());
            const externalCourses = courses.filter((course) => course.allowExternalStudents);
            return {
                activity: {
                    ...activity,
                    parsedCourseCount: courses.length,
                    externalCourseCount: externalCourses.length,
                    allowExternalStudents: externalCourses.length > 0,
                    externalCourses: externalCourses.map((course) => ({
                        schoolId: course.schoolId,
                        activityId: course.activityId,
                        courseId: course.courseId,
                        courseName: course.courseName,
                        eligibility: course.eligibility,
                        allowExternalStudents: true
                    }))
                },
                courses: courses.map((course) => ({ course, activity }))
            };
        } catch (error) {
            failures.push({
                schoolId: activity.schoolId,
                activityId: activity.activityId,
                activityName: activity.activityName,
                error: error instanceof Error ? error.message : String(error)
            });
            return {
                activity: {
                    ...activity,
                    parsedCourseCount: 0,
                    externalCourseCount: 0,
                    allowExternalStudents: false,
                    externalCourses: []
                },
                courses: []
            };
        }
    });

    return {
        activities: results.map((result) => result.activity),
        courseRows: results.flatMap((result) => result.courses),
        failures
    };
}

async function fetchCourseDetails(candidates, now, concurrency) {
    const failures = [];
    const courses = await mapWithConcurrency(candidates, concurrency, async (candidate, index) => {
        if ((index + 1) % 50 === 0) {
            console.log(`   已補齊 ${index + 1}/${candidates.length} 門逐校課程詳細資料`);
        }

        const { course, activity } = candidate;
        try {
            const body = new URLSearchParams({
                method: 'ACTOutIndex_ClsDetail',
                schno: course.schoolId,
                actmang_no: course.activityId,
                actcls_no: course.courseId
            });
            const response = await fetchWithRetry(SCHOOL_ACTIVITY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body
            });
            const payload = await response.json();
            if (!payload.cls_map) throw new Error('missing cls_map');
            return normalizeSchoolActivityCourse(course, activity, payload.cls_map, now);
        } catch (error) {
            failures.push({
                schoolId: course.schoolId,
                activityId: course.activityId,
                courseId: course.courseId,
                courseName: course.courseName,
                error: error instanceof Error ? error.message : String(error)
            });
            // The public activity list already contains enough information to
            // publish the course. Keep it even when the optional detail request
            // fails, and record the failure in the audit report.
            return normalizeSchoolActivityCourse(course, activity, {}, now);
        }
    });

    return { courses, failures };
}

function sourceKey(source) {
    return `${source?.schoolId ?? ''}:${source?.actId ?? ''}:${source?.courseId ?? ''}`;
}

export async function discoverUnindexedSchoolActivities(indexedCourses, options = {}) {
    const now = options.now ?? new Date();
    const concurrency = options.concurrency ?? 4;
    const indexedActivityKeys = new Set(
        indexedCourses
            .filter((course) => course.source?.type === 'ntpc_camp')
            .map((course) => `${course.source.schoolId}:${course.source.actId}`)
    );

    console.log('   讀取公開學校清單…');
    const schools = await fetchSchoolDirectory();
    console.log(`   共 ${schools.length} 所學校／單位，讀取逐校公開活動…`);
    const { activities, failures: schoolFailures } = await fetchActiveActivities(schools, now, concurrency);
    const indexedActivities = activities.filter(
        (activity) => indexedActivityKeys.has(`${activity.schoolId}:${activity.activityId}`)
    );
    const unindexedSummaries = activities.filter(
        (activity) => !indexedActivityKeys.has(`${activity.schoolId}:${activity.activityId}`)
    );
    console.log(`   解析 ${unindexedSummaries.length} 個未被 Camp 索引的活動…`);
    const {
        activities: missingActivities,
        courseRows,
        failures: activityFailures
    } = await fetchUnindexedActivityCourses(unindexedSummaries, concurrency);
    const externalActivities = missingActivities.filter((activity) => activity.allowExternalStudents);

    const report = {
        auditedAt: now.toISOString(),
        summary: {
            schoolsChecked: schools.length,
            publicActiveActivities: activities.length,
            indexedActivities: indexedActivities.length,
            missingActivities: missingActivities.length,
            missingSchools: new Set(missingActivities.map((activity) => activity.schoolId)).size,
            missingCourses: missingActivities.reduce((total, activity) => total + activity.courseCount, 0),
            openMissingActivities: missingActivities.filter((activity) => activity.registrationState === 'open').length,
            upcomingMissingActivities: missingActivities.filter((activity) => activity.registrationState === 'upcoming').length,
            externalMissingActivities: externalActivities.length,
            externalMissingSchools: new Set(externalActivities.map((activity) => activity.schoolId)).size,
            externalMissingCourses: missingActivities.reduce(
                (total, activity) => total + activity.externalCourseCount,
                0
            ),
            failedSchools: schoolFailures.length,
            failedActivities: activityFailures.length
        },
        missingActivities,
        failures: {
            schools: schoolFailures,
            activities: activityFailures,
            courseDetails: []
        }
    };

    return { report, courseRows };
}

export async function crawlUnindexedSchoolCourses(indexedCourses, options = {}) {
    const now = options.now ?? new Date();
    const concurrency = options.concurrency ?? 4;
    const { report, courseRows } = await discoverUnindexedSchoolActivities(indexedCourses, {
        now,
        concurrency
    });
    const existingKeys = new Set(indexedCourses.map((course) => sourceKey(course.source)));
    const candidates = courseRows.filter(
        ({ course }) => !existingKeys.has(`${course.schoolId}:${course.activityId}:${course.courseId}`)
    );
    console.log(`   補齊 ${candidates.length} 門逐校課程詳細資料…`);
    const { courses, failures } = await fetchCourseDetails(candidates, now, concurrency);

    report.summary.importedCourses = courses.length;
    report.summary.importedExternalCourses = courses.filter(
        (course) => course.eligibility.allowExternalStudents
    ).length;
    report.summary.failedCourseDetails = failures.length;
    report.failures.courseDetails = failures;
    return { courses, report };
}
