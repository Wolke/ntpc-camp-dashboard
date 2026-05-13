import type { Course } from '../types/course';
import { getCourseStatus } from '../store/courseStore';
import { getCourseDisplayTitle } from './campAnalysis';

export interface AdvisorProfile {
    area: string;
    grade: number;
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

const TRAIT_KEYWORDS: Record<string, string[]> = {
    active: ['運動', '體育', '籃球', '足球', '羽球', '桌球', '網球', '躲避', '飛盤', '跆拳', '柔道', '直排輪', '扯鈴', '體能'],
    tech: ['Roblox', '麥塊', 'Minecraft', 'Scratch', 'AI', '程式', '電競', '電玩', '電腦', '機器人', '科技'],
    art: ['藝術', '手作', '繪畫', '美術', '彩繪', '串珠', '氣球', '捏塑', '拼豆', '水彩', '書法', '設計'],
    strategy: ['桌遊', '圍棋', '象棋', '心算', '珠心算', '邏輯', '策略', '科學', '寶可夢', '卡牌'],
    social: ['營', '球', '舞蹈', '團體', '戲劇', '探索', '社'],
    performance: ['舞蹈', 'KPOP', '街舞', '魔術', '戲劇', '弦樂', '古箏', '烏克麗麗', '太鼓', '表演'],
    outdoor: ['生態', '海洋', '戶外', '探索', '天文', '自然', '浮潛', '輕艇'],
    confidence: ['小班', '體驗', '入門', '基礎', '初階'],
};

function normalize(value: string): string {
    return value.toLowerCase().split('臺').join('台');
}

function courseText(course: Course): string {
    const genericCourseNames = new Set(['', '健康與體育', '藝術', '語文', '[不開班]']);
    return [
        getCourseDisplayTitle(course),
        course.schoolName,
        course.campName,
        genericCourseNames.has(course.category) ? '' : course.category,
        genericCourseNames.has(course.courseName) ? '' : course.courseName,
        course.teacher,
        course.fee.description,
        course.eligibility.gradeNames.join(' '),
        course.tags?.join(' '),
    ].join(' ');
}

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
    const title = getCourseDisplayTitle(course);
    const text = courseText(course);
    const normalizedText = normalize(text);
    const area = normalize(profile.area.trim());
    const now = new Date();
    const status = getCourseStatus(course, now);

    if (title.includes('[不開班]')) return null;
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

    if (area && normalize(course.schoolName).includes(area)) {
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

    profile.traits.forEach((trait) => {
        const matches = (TRAIT_KEYWORDS[trait] || []).filter((keyword) => normalizedText.includes(normalize(keyword)));
        if (matches.length > 0) {
            score += Math.min(18, matches.length * 6);
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
