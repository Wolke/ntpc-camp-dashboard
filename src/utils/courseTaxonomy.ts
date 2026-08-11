import type { Course } from '../types/course';
import { formatCourseWeekSummary, getCourseDayCount, getCourseDurationLabel } from './courseSchedule';

export interface CourseTheme {
    id: string;
    label: string;
    keywords: string[];
}

const GENERIC_COURSE_NAMES = new Set(['', '健康與體育', '藝術', '語文', '[不開班]']);

export const THEME_RULES: CourseTheme[] = [
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
        keywords: ['舞蹈', '表演', '流行舞', 'KPOP', '街舞', '律動', '太鼓', '扯鈴', '魔術', '戲劇', '劇場', '戲曲', '扮戲', '演戲'],
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

const OTHER_THEME: CourseTheme = {
    id: 'other',
    label: '其他探索課程',
    keywords: [],
};

export const TRAIT_THEME_IDS: Record<string, string[]> = {
    active: ['sports-ball', 'martial-fitness', 'water-outdoor'],
    tech: ['tech-game'],
    art: ['arts-craft'],
    strategy: ['strategy-science'],
    performance: ['dance-performance', 'life-career'],
    outdoor: ['water-outdoor', 'strategy-science'],
};

export function normalizeText(value: string): string {
    return value.toLowerCase().split('臺').join('台');
}

export function matchesCourseKeyword(text: string, keyword: string): boolean {
    const normalizedText = normalizeText(text);
    const normalizedKeyword = normalizeText(keyword);

    if (/^[a-z0-9]+$/.test(normalizedKeyword)) {
        const escapedKeyword = normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const boundaryPattern = new RegExp(`(^|[^a-z0-9])${escapedKeyword}($|[^a-z0-9])`);
        return boundaryPattern.test(normalizedText);
    }

    return normalizedText.includes(normalizedKeyword);
}

export function getCourseDisplayTitle(course: Course): string {
    if (course.category && !GENERIC_COURSE_NAMES.has(course.category)) {
        return course.category;
    }
    if (course.courseName && !GENERIC_COURSE_NAMES.has(course.courseName)) {
        return course.courseName;
    }
    return course.campName || course.schoolName;
}

export function getCourseSearchText(course: Course): string {
    const dayCount = getCourseDayCount(course);

    return [
        getCourseDisplayTitle(course),
        course.source?.name,
        course.source?.type,
        course.school,
        course.schoolName,
        course.campName,
        GENERIC_COURSE_NAMES.has(course.category) ? '' : course.category,
        GENERIC_COURSE_NAMES.has(course.courseName) ? '' : course.courseName,
        course.teacher,
        course.address,
        course.fee.description,
        formatCourseWeekSummary(course),
        dayCount ? getCourseDurationLabel(dayCount) : '',
        course.eligibility.allowExternalStudents ? '開放外校 外校學生' : '',
        course.eligibility.gradeNames.join(' '),
        course.tags?.join(' '),
    ].filter(Boolean).join(' ');
}

export function getThemeById(themeId: string | null | undefined): CourseTheme | null {
    if (!themeId) return null;
    if (themeId === OTHER_THEME.id) return OTHER_THEME;
    return THEME_RULES.find((theme) => theme.id === themeId) || null;
}

export function classifyTheme(course: Course): CourseTheme {
    const text = getCourseSearchText(course);
    const rule = THEME_RULES.find(({ keywords }) =>
        keywords.some((keyword) => matchesCourseKeyword(text, keyword))
    );

    return rule || OTHER_THEME;
}

export function getTraitMatchedThemes(trait: string, courseTheme: CourseTheme): CourseTheme[] {
    const themeIds = TRAIT_THEME_IDS[trait] || [];
    if (!themeIds.includes(courseTheme.id)) return [];
    return [courseTheme];
}
