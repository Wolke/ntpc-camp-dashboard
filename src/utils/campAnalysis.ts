import type { Course } from '../types/course';
import { classifyTheme, getCourseDisplayTitle, getCourseTopicText, matchesCourseKeyword } from './courseTaxonomy';

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

const FEATURE_SUPPLY_GROUPS = [
    {
        label: '戲劇表演',
        keywords: ['扮戲', '戲劇', '劇場', '戲曲'],
    },
    {
        label: '料理與烘焙',
        keywords: ['料理', '烘焙', '點心', '甜點', '烹飪', '小廚師', '廚藝', '廚房', '蛋糕', '餅乾', '餐飲'],
    },
];

const FEATURE_EXCLUDED_THEME_IDS = new Set([
    'tech-game',
    'strategy-science',
]);

const HIGH_FEATURE_KEYWORDS = ['扮戲', '戲劇', '劇場', '戲曲'];
export const FEATURE_SCHOOL_LIMIT = 4;

interface FeatureSupply {
    label: string;
    courseCount: number;
    schoolCount: number;
}

function getFeatureSupplyGroup(keyword: string): { label: string; keywords: string[] } {
    return FEATURE_SUPPLY_GROUPS.find((group) => group.keywords.includes(keyword)) || {
        label: keyword,
        keywords: [keyword],
    };
}

function uniqueCount(values: string[]): number {
    return new Set(values.filter(Boolean)).size;
}

function getRepresentativeCourses(courses: Course[]): Course[] {
    const seen = new Set<string>();

    return [...courses]
        .filter((course) => !getCourseDisplayTitle(course).includes('午餐班'))
        .sort((a, b) => {
            const aSeats = Math.max(a.quota.planned, a.quota.actual, a.quota.enrolled);
            const bSeats = Math.max(b.quota.planned, b.quota.actual, b.quota.enrolled);
            return bSeats - aSeats || getCourseDisplayTitle(a).localeCompare(getCourseDisplayTitle(b), 'zh-TW');
        })
        .filter((course) => {
            const key = `${course.schoolName}|${getCourseDisplayTitle(course)}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .slice(0, 3);
}

function getFeaturedReasons(
    course: Course,
    featureSupplyByKeyword: Map<string, FeatureSupply>,
): string[] {
    const text = getCourseTopicText(course);
    const reasons: string[] = [];
    const matchedFeatures = FEATURE_KEYWORDS.filter(({ keyword }) => matchesCourseKeyword(text, keyword));

    matchedFeatures.forEach(({ reason }) => {
        if (!reasons.includes(reason)) {
            reasons.push(reason);
        }
    });

    const rarestFeature = matchedFeatures
        .map(({ keyword }) => featureSupplyByKeyword.get(keyword))
        .filter((supply): supply is FeatureSupply => Boolean(supply))
        .filter(({ schoolCount }) => schoolCount > 0 && schoolCount <= FEATURE_SCHOOL_LIMIT)
        .sort((a, b) => a.schoolCount - b.schoolCount || a.courseCount - b.courseCount)[0];

    if (rarestFeature) {
        reasons.push(
            `「${rarestFeature.label}」僅 ${rarestFeature.schoolCount} 校開設（${rarestFeature.courseCount} 門課）`
        );
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

    const featureSupplyByKeyword = new Map(
        FEATURE_KEYWORDS.map(({ keyword }): [string, FeatureSupply] => {
            const group = getFeatureSupplyGroup(keyword);
            const matchingCourses = courses.filter((course) => {
                const text = getCourseTopicText(course);
                return group.keywords.some((groupKeyword) => matchesCourseKeyword(text, groupKeyword));
            });

            return [keyword, {
                label: group.label,
                courseCount: matchingCourses.length,
                schoolCount: uniqueCount(matchingCourses.map((course) => course.schoolName)),
            }];
        }),
    );

    const featuredCandidates = courses
        .map((course) => {
            const title = getCourseDisplayTitle(course);
            const reasons = getFeaturedReasons(course, featureSupplyByKeyword);
            const theme = classifyTheme(course);
            const matchedFeatureKeywords = FEATURE_KEYWORDS.filter(({ keyword }) =>
                matchesCourseKeyword(getCourseTopicText(course), keyword)
            ).map(({ keyword }) => keyword);
            const rareFeatureLabels = Array.from(new Set(
                matchedFeatureKeywords
                    .map((keyword) => featureSupplyByKeyword.get(keyword))
                    .filter((supply): supply is FeatureSupply => Boolean(
                        supply && supply.schoolCount > 0 && supply.schoolCount <= FEATURE_SCHOOL_LIMIT
                    ))
                    .map(({ label }) => label),
            ));
            const rareFeatureMatches = rareFeatureLabels.length;
            const highFeatureMatches = HIGH_FEATURE_KEYWORDS.some((keyword) =>
                matchesCourseKeyword(getCourseTopicText(course), keyword) &&
                (featureSupplyByKeyword.get(keyword)?.schoolCount || 0) <= FEATURE_SCHOOL_LIMIT
            ) ? 1 : 0;
            const score =
                rareFeatureMatches * 25 +
                highFeatureMatches * 25 +
                (rareFeatureMatches > 0 ? 5 : 0) +
                (course.eligibility.allowExternalStudents ? 5 : 0) +
                (course.fee.isFree ? 3 : 0) +
                Math.min(course.eligibility.grades.length, 6) +
                (course.quota.planned > 0 && course.quota.planned <= 20 ? 4 : 0);

            const noveltyKeys = rareFeatureLabels.length > 0
                ? rareFeatureLabels.map((label) => `feature:${label}`)
                : [`theme:${theme.id}`];

            return {
                course,
                title,
                score,
                reasons,
                rareFeatureMatches,
                noveltyKeys,
            };
        })
        .filter((camp) => {
            const theme = classifyTheme(camp.course);
            if (FEATURE_EXCLUDED_THEME_IDS.has(theme.id)) {
                return false;
            }

            return camp.reasons.length >= 2 && camp.rareFeatureMatches > 0;
        })
        .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'zh-TW'));

    const seenFeatured = new Set<string>();
    const seenNoveltyKeys = new Set<string>();
    const featuredCamps = featuredCandidates
        .filter((camp) => {
            const key = `${camp.course.schoolName}-${camp.title}`;
            if (seenFeatured.has(key)) return false;
            if (camp.noveltyKeys.every((noveltyKey) => seenNoveltyKeys.has(noveltyKey))) return false;
            seenFeatured.add(key);
            camp.noveltyKeys.forEach((noveltyKey) => seenNoveltyKeys.add(noveltyKey));
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
