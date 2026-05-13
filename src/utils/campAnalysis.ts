import type { Course } from '../types/course';

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

const THEME_RULES = [
    {
        id: 'water-outdoor',
        label: '水域與戶外體驗',
        keywords: ['浮潛', '輕艇', '水域', '海洋', '戶外', '探索'],
    },
    {
        id: 'sports-ball',
        label: '球類與綜合運動',
        keywords: ['籃球', '足球', '桌球', '羽球', '排球', '棒球', '躲避', '飛盤', '乒乓', '疊杯', '球', '運動', '體育'],
    },
    {
        id: 'martial-fitness',
        label: '武術與體能',
        keywords: ['跆拳', '柔道', '體能', '直排輪', '網球', '冰石壺'],
    },
    {
        id: 'tech-game',
        label: '科技、程式與電競',
        keywords: ['Roblox', '麥塊', 'Minecraft', 'Scratch', '3D列印', 'EV3', 'AI', '人工智慧', '程式', '電競', '電玩', '電腦', '電路', '機器人', '科技'],
    },
    {
        id: 'arts-craft',
        label: '藝術手作與設計',
        keywords: ['藝術', '手作', '彩繪', '繪畫', '串珠', '氣球', '奶油畫', '泡泡畫', '石英砂', '編織', '書法', '水彩', '壓克力', '捏塑', 'DIY', '香氛', '木匠', '拼豆', '美術', '設計'],
    },
    {
        id: 'dance-performance',
        label: '舞蹈與表演',
        keywords: ['舞蹈', '表演', '流行舞', 'KPOP', '街舞', '律動', '太鼓', '扯鈴', '魔術', '戲劇'],
    },
    {
        id: 'language',
        label: '英語與語文',
        keywords: ['英語', '英文', '語文', '閱讀', '寫作'],
    },
    {
        id: 'strategy-science',
        label: '策略、科學與探索',
        keywords: ['寶可夢', '卡牌', '策略', '桌遊', '圍棋', '象棋', '心算', '珠心算', '邏輯', '科學', '外太空', '天文'],
    },
    {
        id: 'life-career',
        label: '生活實作與職涯探索',
        keywords: ['醫師', '料理', '烘焙', '小廚師', '空靈鼓', '古箏', '烏克麗麗', '樂器'],
    },
    {
        id: 'care-support',
        label: '照顧與銜接服務',
        keywords: ['午餐班', '照顧班', '課前照顧', '課後照顧', '中午照顧'],
    },
];

const FEATURE_KEYWORDS = [
    { keyword: '浮潛', reason: '水域體驗，主題稀有' },
    { keyword: '輕艇', reason: '戶外水域運動，辨識度高' },
    { keyword: '冰石壺', reason: '少見運動項目' },
    { keyword: '醫師', reason: '職涯探索主題' },
    { keyword: '料理', reason: '生活實作課程' },
    { keyword: '烘焙', reason: '生活實作課程' },
    { keyword: '古箏', reason: '傳統音樂體驗' },
    { keyword: '烏克麗麗', reason: '樂器體驗課程' },
    { keyword: 'Roblox', reason: '遊戲設計與數位創作' },
    { keyword: '麥塊', reason: '遊戲世界建構主題' },
    { keyword: 'AI', reason: '科技與新興應用' },
    { keyword: '電競', reason: '數位競技主題' },
    { keyword: '寶可夢', reason: '卡牌策略主題' },
    { keyword: '卡牌', reason: '策略與對戰設計' },
    { keyword: '外太空', reason: '科學探索主題' },
    { keyword: '奶油畫', reason: '特殊藝術媒材' },
    { keyword: '泡泡畫', reason: '特殊藝術媒材' },
    { keyword: '石英砂', reason: '特殊肌理創作' },
    { keyword: '造型氣球', reason: '手作表演型課程' },
    { keyword: '串珠', reason: '精細手作課程' },
    { keyword: '拼豆', reason: '精細手作課程' },
];

function getCourseText(course: Course): string {
    return [
        course.category,
        course.courseName,
        course.campName,
        course.teacher,
        course.fee.description,
        course.eligibility.gradeNames.join(' '),
    ].join(' ');
}

export function getCourseDisplayTitle(course: Course): string {
    const genericCourseNames = new Set(['', '健康與體育', '藝術', '語文', '[不開班]']);
    if (course.category && !genericCourseNames.has(course.category)) {
        return course.category;
    }
    if (course.courseName && !genericCourseNames.has(course.courseName)) {
        return course.courseName;
    }
    return course.campName || course.schoolName;
}

function classifyTheme(course: Course): { id: string; label: string } {
    const text = getCourseText(course).toLowerCase();
    const rule = THEME_RULES.find(({ keywords }) =>
        keywords.some((keyword) => text.includes(keyword.toLowerCase()))
    );

    return rule ? { id: rule.id, label: rule.label } : { id: 'other', label: '其他探索課程' };
}

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
    const text = getCourseText(course);
    const title = getCourseDisplayTitle(course);
    const theme = classifyTheme(course);
    const reasons: string[] = [];

    FEATURE_KEYWORDS.forEach(({ keyword, reason }) => {
        if (text.toLowerCase().includes(keyword.toLowerCase()) && !reasons.includes(reason)) {
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
                getCourseText(course).toLowerCase().includes(keyword.toLowerCase())
            ).length;
            const score =
                specialMatches * 25 +
                ((themeCounts.get(theme.id) || 0) <= 8 ? 12 : 0) +
                ((titleCounts.get(title) || 0) === 1 ? 5 : 0) +
                (course.eligibility.allowExternalStudents ? 5 : 0) +
                (course.fee.isFree ? 3 : 0) +
                Math.min(course.eligibility.grades.length, 6) +
                (course.quota.planned > 0 && course.quota.planned <= 20 ? 4 : 0);

            return { course, title, score, reasons, specialMatches, themeCount: themeCounts.get(theme.id) || 0 };
        })
        .filter((camp) => camp.reasons.length >= 2 && (camp.specialMatches > 0 || camp.themeCount <= 8))
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
