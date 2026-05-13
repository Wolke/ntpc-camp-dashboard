import type { Course } from '../types/course';
import { classifyTheme, getCourseDisplayTitle, getCourseSearchText, matchesCourseKeyword } from './courseTaxonomy';

export interface ThemeInsight {
    id: string;
    label: string;
    courses: Course[];
    courseCount: number;
    schoolCount: number;
    totalPlanned: number;
    totalActual: number;
    totalEnrolled: number;
    freeCount: number;
    externalCount: number;
    gradeCount: number;
    score: number;
    representativeCourses: Course[];
}

export interface FeaturedCamp {
    course: Course;
    title: string;
    score: number;
    reasons: string[];
}

export interface CampAnalysis {
    totalCourses: number;
    totalSchools: number;
    freeRate: number;
    externalRate: number;
    averagePlannedSeats: number;
    popularThemes: ThemeInsight[];
    featuredCamps: FeaturedCamp[];
    registrationSignals: {
        coursesWithEnrollment: number;
        coursesWithPlannedSeats: number;
        totalEnrolled: number;
        totalPlanned: number;
    };
}

const FEATURE_KEYWORDS = [
    { keyword: '浮潛', reason: '水域體驗，主題稀有' },
    { keyword: '輕艇', reason: '戶外水域運動，辨識度高' },
    { keyword: '冰石壺', reason: '少見運動項目' },
    { keyword: '扮戲', reason: '少見戲劇表演體驗' },
    { keyword: '戲劇', reason: '戲劇表演體驗' },
    { keyword: '劇場', reason: '劇場表演體驗' },
    { keyword: '戲曲', reason: '傳統戲曲體驗' },
    { keyword: '魔術', reason: '表演型課程' },
    { keyword: '醫師', reason: '職涯探索主題' },
    { keyword: '料理', reason: '生活實作課程' },
    { keyword: '烘焙', reason: '生活實作課程' },
    { keyword: '古箏', reason: '傳統音樂體驗' },
    { keyword: '烏克麗麗', reason: '樂器體驗課程' },
    { keyword: '奶油畫', reason: '特殊藝術媒材' },
    { keyword: '泡泡畫', reason: '特殊藝術媒材' },
    { keyword: '石英砂', reason: '特殊肌理創作' },
    { keyword: '造型氣球', reason: '手作表演型課程' },
    { keyword: '串珠', reason: '精細手作課程' },
    { keyword: '拼豆', reason: '精細手作課程' },
];

const FEATURE_EXCLUDED_THEME_IDS = new Set([
    'tech-game',
    'strategy-science',
]);

const HIGH_FEATURE_KEYWORDS = ['扮戲', '戲劇', '劇場', '戲曲'];

function uniqueCount(values: string[]): number {
    return new Set(values.filter(Boolean)).size;
}

function getRepresentativeCourses(courses: Course[]): Course[] {
    return [...courses]
        .filter((course) => !getCourseDisplayTitle(course).includes('午餐班'))
        .sort((a, b) => {
            const aSeats = Math.max(a.quota.planned, a.quota.actual, a.quota.enrolled);
            const bSeats = Math.max(b.quota.planned, b.quota.actual, b.quota.enrolled);
            return bSeats - aSeats || getCourseDisplayTitle(a).localeCompare(getCourseDisplayTitle(b), 'zh-TW');
        })
        .slice(0, 3);
}

function getFeaturedReasons(course: Course, titleCounts: Map<string, number>, themeCounts: Map<string, number>): string[] {
    const text = getCourseSearchText(course);
    const title = getCourseDisplayTitle(course);
    const theme = classifyTheme(course);
    const reasons: string[] = [];

    FEATURE_KEYWORDS.forEach(({ keyword, reason }) => {
        if (matchesCourseKeyword(text, keyword) && !reasons.includes(reason)) {
            reasons.push(reason);
        }
    });

    if ((titleCounts.get(title) || 0) === 1) {
        reasons.push('課程名稱在資料中只出現一次');
    }
    if ((themeCounts.get(theme.id) || 0) <= 8) {
        reasons.push('所屬主題供給少');
    }
    if (course.fee.isFree) {
        reasons.push('免費參加');
    }
    if (course.eligibility.allowExternalStudents) {
        reasons.push('開放外校學生');
    }
    if (course.eligibility.grades.length >= 4) {
        reasons.push('跨年級可參加');
    }
    if (course.quota.planned > 0 && course.quota.planned <= 20) {
        reasons.push('小班制名額');
    }

    return reasons.slice(0, 4);
}

export function analyzeCamps(courses: Course[]): CampAnalysis {
    const totalCourses = courses.length;
    const totalSchools = uniqueCount(courses.map((course) => course.schoolName));
    const grouped = new Map<string, { label: string; courses: Course[] }>();

    courses.forEach((course) => {
        const theme = classifyTheme(course);
        const existing = grouped.get(theme.id);
        if (existing) {
            existing.courses.push(course);
        } else {
            grouped.set(theme.id, { label: theme.label, courses: [course] });
        }
    });

    const popularThemes = Array.from(grouped.entries())
        .filter(([id]) => id !== 'other' && id !== 'care-support')
        .map(([id, group]) => {
            const themeCourses = group.courses;
            const courseCount = themeCourses.length;
            const schoolCount = uniqueCount(themeCourses.map((course) => course.schoolName));
            const totalPlanned = themeCourses.reduce((sum, course) => sum + Math.max(course.quota.planned, 0), 0);
            const totalActual = themeCourses.reduce((sum, course) => sum + Math.max(course.quota.actual, 0), 0);
            const totalEnrolled = themeCourses.reduce((sum, course) => sum + Math.max(course.quota.enrolled, 0), 0);
            const freeCount = themeCourses.filter((course) => course.fee.isFree).length;
            const externalCount = themeCourses.filter((course) => course.eligibility.allowExternalStudents).length;
            const gradeCount = uniqueCount(themeCourses.flatMap((course) => course.eligibility.gradeNames));
            const score =
                courseCount * 3 +
                schoolCount * 5 +
                totalPlanned * 0.2 +
                totalActual * 0.4 +
                totalEnrolled * 0.8 +
                freeCount * 0.5 +
                externalCount;

            return {
                id,
                label: group.label,
                courses: themeCourses,
                courseCount,
                schoolCount,
                totalPlanned,
                totalActual,
                totalEnrolled,
                freeCount,
                externalCount,
                gradeCount,
                score,
                representativeCourses: getRepresentativeCourses(themeCourses),
            };
        })
        .sort((a, b) => b.score - a.score);

    const titleCounts = new Map<string, number>();
    courses.forEach((course) => {
        const title = getCourseDisplayTitle(course);
        titleCounts.set(title, (titleCounts.get(title) || 0) + 1);
    });

    const themeCounts = new Map<string, number>();
    courses.forEach((course) => {
        const theme = classifyTheme(course);
        themeCounts.set(theme.id, (themeCounts.get(theme.id) || 0) + 1);
    });

    const featuredCandidates = courses
        .map((course) => {
            const title = getCourseDisplayTitle(course);
            const reasons = getFeaturedReasons(course, titleCounts, themeCounts);
            const theme = classifyTheme(course);
            const specialMatches = FEATURE_KEYWORDS.filter(({ keyword }) =>
                matchesCourseKeyword(getCourseSearchText(course), keyword)
            ).length;
            const highFeatureMatches = HIGH_FEATURE_KEYWORDS.filter((keyword) =>
                matchesCourseKeyword(getCourseSearchText(course), keyword)
            ).length;
            const score =
                specialMatches * 25 +
                highFeatureMatches * 25 +
                ((themeCounts.get(theme.id) || 0) <= 8 ? 12 : 0) +
                ((titleCounts.get(title) || 0) === 1 ? 5 : 0) +
                (course.eligibility.allowExternalStudents ? 5 : 0) +
                (course.fee.isFree ? 3 : 0) +
                Math.min(course.eligibility.grades.length, 6) +
                (course.quota.planned > 0 && course.quota.planned <= 20 ? 4 : 0);

            return { course, title, score, reasons, specialMatches, themeCount: themeCounts.get(theme.id) || 0 };
        })
        .filter((camp) => {
            const theme = classifyTheme(camp.course);
            if (FEATURE_EXCLUDED_THEME_IDS.has(theme.id)) {
                return false;
            }

            return camp.reasons.length >= 2 && (camp.specialMatches > 0 || camp.themeCount <= 8);
        })
        .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'zh-TW'));

    const seenFeatured = new Set<string>();
    const featuredCamps = featuredCandidates
        .filter((camp) => {
            const key = `${camp.course.schoolName}-${camp.title}`;
            if (seenFeatured.has(key)) return false;
            seenFeatured.add(key);
            return true;
        })
        .slice(0, 12);

    const totalPlanned = courses.reduce((sum, course) => sum + Math.max(course.quota.planned, 0), 0);
    const totalEnrolled = courses.reduce((sum, course) => sum + Math.max(course.quota.enrolled, 0), 0);
    const coursesWithPlannedSeats = courses.filter((course) => course.quota.planned > 0).length;

    return {
        totalCourses,
        totalSchools,
        freeRate: totalCourses > 0 ? courses.filter((course) => course.fee.isFree).length / totalCourses : 0,
        externalRate: totalCourses > 0 ? courses.filter((course) => course.eligibility.allowExternalStudents).length / totalCourses : 0,
        averagePlannedSeats: coursesWithPlannedSeats > 0 ? totalPlanned / coursesWithPlannedSeats : 0,
        popularThemes,
        featuredCamps: featuredCamps.map(({ course, title, score, reasons }) => ({ course, title, score, reasons })),
        registrationSignals: {
            coursesWithEnrollment: courses.filter((course) => course.quota.enrolled > 0).length,
            coursesWithPlannedSeats,
            totalEnrolled,
            totalPlanned,
        },
    };
}
