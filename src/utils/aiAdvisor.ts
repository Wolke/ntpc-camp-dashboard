import type { Course } from '../types/course';
import { getCourseStatus } from './courseFilters';
import { classifyTheme, getCourseDisplayTitle, getCourseSearchText, getTraitMatchedThemes, normalizeText } from './courseTaxonomy';

export interface AdvisorProfile {
    area: string;
    grade: number | null;
    traits: string[];
    timePreference: 'all' | 'morning' | 'afternoon' | 'full_day';
    budgetMode: 'flexible' | 'free_only' | 'max' | 'range';
    minBudget: number | null;
    maxBudget: number | null;
    notes: string;
}

export interface AdvisorRecommendation {
    course: Course;
    title: string;
    score: number;
    fit: 'high' | 'medium' | 'explore';
    budgetLabel: string;
    budgetStatus: 'free' | 'within' | 'below_range' | 'above_range' | 'unknown';
    reasons: string[];
    cautions: string[];
}

export interface AdvisorResult {
    summary: string;
    recommendations: AdvisorRecommendation[];
    rejectedCount: number;
}

export const TRAIT_OPTIONS = [
    { id: 'active', label: '坐不住、需要動一動' },
    { id: 'tech', label: '喜歡電腦、遊戲、科技' },
    { id: 'art', label: '喜歡畫畫、手作、設計' },
    { id: 'strategy', label: '安靜、喜歡思考或桌遊' },
    { id: 'social', label: '喜歡跟同伴互動' },
    { id: 'performance', label: '喜歡音樂、舞蹈、表演' },
    { id: 'outdoor', label: '喜歡自然、戶外、探索' },
    { id: 'confidence', label: '需要建立自信、適合小班' },
];

const NON_THEME_TRAIT_KEYWORDS: Record<string, string[]> = {
    social: ['營', '團體', '社團', '合作', '互動'],
    confidence: ['小班', '體驗', '入門', '基礎', '初階'],
};

function getTimeSlot(course: Course): 'morning' | 'afternoon' | 'full_day' | 'unknown' {
    const { startTime, endTime } = course.schedule;
    if (!startTime || !endTime) return 'unknown';

    if (startTime <= '09:00' && endTime >= '16:00') return 'full_day';
    if (startTime < '12:00' && endTime <= '13:30') return 'morning';
    if (startTime >= '12:00') return 'afternoon';
    return 'unknown';
}

function getTraitLabel(trait: string): string {
    return TRAIT_OPTIONS.find((option) => option.id === trait)?.label || trait;
}

function formatMoney(value: number): string {
    return new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 0 }).format(value);
}

function getBudgetText(profile: AdvisorProfile): string {
    if (profile.budgetMode === 'free_only') return '只看免費課程';
    if (profile.budgetMode === 'max' && profile.maxBudget !== null) return `預算上限 ${formatMoney(profile.maxBudget)} 元`;
    if (profile.budgetMode === 'range' && profile.minBudget !== null && profile.maxBudget !== null) {
        return `預算範圍 ${formatMoney(profile.minBudget)}-${formatMoney(profile.maxBudget)} 元`;
    }
    return '預算先不限制';
}

function getBudgetFit(course: Course, profile: AdvisorProfile): AdvisorRecommendation['budgetStatus'] {
    if (!course.fee.description && !course.fee.amount) return 'unknown';
    if (course.fee.isFree) return 'free';
    if (profile.budgetMode === 'range' && profile.minBudget !== null && course.fee.amount < profile.minBudget) return 'below_range';
    return 'within';
}

function buildSummary(profile: AdvisorProfile, candidateCount: number): string {
    if (profile.grade === null) {
        return '請先選擇孩子目前的年級，再由智慧顧問整理符合資格的課程。';
    }
    const traitText = profile.traits.length > 0
        ? profile.traits.map(getTraitLabel).join('、')
        : '還沒有明確偏好';
    const budgetText = getBudgetText(profile);
    const timeText = {
        all: '時段先保持彈性',
        morning: '偏好上午',
        afternoon: '偏好下午',
        full_day: '可接受全天',
    }[profile.timePreference];

    return `我先把孩子理解成：${profile.area || '不限地區'}附近、目前 ${profile.grade} 年級，個性/興趣是「${traitText}」，${timeText}，${budgetText}。目前符合基本條件的營隊有 ${candidateCount} 門，下面依開課日期與時段逐一排序。`;
}

function scoreCourse(course: Course, profile: AdvisorProfile): AdvisorRecommendation | null {
    if (profile.grade === null) return null;

    const title = getCourseDisplayTitle(course);
    const normalizedText = normalizeText(getCourseSearchText(course));
    const area = normalizeText(profile.area.trim());
    const now = new Date();
    const status = getCourseStatus(course, now);
    const theme = classifyTheme(course);

    if (title.includes('[不開班]')) return null;
    if (!course.eligibility.allowExternalStudents) return null;
    if (!course.eligibility.grades.includes(profile.grade)) return null;
    if (area && !normalizedText.includes(area)) return null;
    if (profile.budgetMode === 'free_only' && !course.fee.isFree) return null;
    if (profile.maxBudget !== null && course.fee.amount > profile.maxBudget) return null;
    if (status.courseTime === 'ended') return null;
    if (status.registration === 'closed') return null;

    const slot = getTimeSlot(course);
    if (profile.timePreference !== 'all' && slot !== profile.timePreference) return null;

    let score = 35;
    const reasons: string[] = [];
    const cautions: string[] = [];

    if (area && normalizeText(course.schoolName).includes(area)) {
        score += 18;
        reasons.push(`地點符合「${profile.area}」`);
    }

    const budgetStatus = getBudgetFit(course, profile);
    let budgetLabel = course.fee.isFree ? '免費' : course.fee.description || '費用未標示';

    if (course.fee.isFree) {
        score += 5;
        reasons.push('免費參加');
    } else if (profile.budgetMode === 'range' && profile.minBudget !== null && course.fee.amount < profile.minBudget) {
        budgetLabel = `${course.fee.description}，低於設定範圍`;
        reasons.push(`費用 ${course.fee.description}，比預算下限低`);
    } else if (profile.maxBudget !== null) {
        budgetLabel = `${course.fee.description}，在預算內`;
        score += 4;
        reasons.push(`費用 ${course.fee.description} 在預算內`);
    } else if (course.fee.description) {
        reasons.push(`費用 ${course.fee.description}`);
    }

    reasons.push('開放外校學生');

    profile.traits.forEach((trait) => {
        const matchedThemes = getTraitMatchedThemes(trait, theme);
        if (matchedThemes.length > 0) {
            score += 14;
            reasons.push(`符合「${getTraitLabel(trait)}」：${theme.label}`);
        }

        const matches = (NON_THEME_TRAIT_KEYWORDS[trait] || []).filter((keyword) => normalizedText.includes(normalizeText(keyword)));
        if (matches.length > 0) {
            score += Math.min(10, matches.length * 5);
            reasons.push(`符合「${getTraitLabel(trait)}」：${matches.slice(0, 2).join('、')}`);
        }
    });

    if (profile.traits.includes('confidence') && course.quota.planned > 0 && course.quota.planned <= 20) {
        score += 10;
        reasons.push('名額較少，較像小班制');
    }

    if (course.eligibility.grades.length <= 3) {
        score += 4;
        reasons.push('年級範圍較集中');
    }

    if (status.registration === 'not_started') {
        reasons.push('報名尚未開放，可以先加入提醒');
    } else if (status.registration === 'closing_soon') {
        score -= 4;
        cautions.push('報名即將截止');
    }

    if (course.quota.planned > 0 && course.quota.actual >= course.quota.planned) {
        score -= 12;
        cautions.push('目前可能已滿額');
    }

    if (course.schedule.startTime && course.schedule.endTime) {
        reasons.push(`${course.schedule.startTime}-${course.schedule.endTime}`);
    }

    return {
        course,
        title,
        score,
        fit: score >= 72 ? 'high' : score >= 55 ? 'medium' : 'explore',
        budgetLabel,
        budgetStatus,
        reasons: reasons.slice(0, 5),
        cautions,
    };
}

export function getAdvisorRecommendations(courses: Course[], profile: AdvisorProfile): AdvisorResult {
    if (profile.grade === null) {
        return {
            summary: buildSummary(profile, 0),
            recommendations: [],
            rejectedCount: 0,
        };
    }

    const recommendations = courses
        .map((course) => scoreCourse(course, profile))
        .filter((item): item is AdvisorRecommendation => Boolean(item))
        .sort((a, b) => {
            const dateCompare = (a.course.schedule.startDate || '').localeCompare(b.course.schedule.startDate || '');
            if (dateCompare !== 0) return dateCompare;
            const timeCompare = (a.course.schedule.startTime || '').localeCompare(b.course.schedule.startTime || '');
            if (timeCompare !== 0) return timeCompare;
            return b.score - a.score;
        });

    return {
        summary: buildSummary(profile, recommendations.length),
        recommendations: recommendations.slice(0, 30),
        rejectedCount: Math.max(0, courses.length - recommendations.length),
    };
}
