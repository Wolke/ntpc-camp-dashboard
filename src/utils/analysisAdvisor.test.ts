import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeCourse } from '../test/courseFactory';
import { analyzeCamps } from './campAnalysis';
import { type AdvisorProfile, getAdvisorRecommendations } from './aiAdvisor';
import { classifyTheme } from './courseTaxonomy';

const emptyProfile: AdvisorProfile = {
    area: '',
    grade: null,
    traits: [],
    timePreference: 'all',
    budgetMode: 'flexible',
    minBudget: null,
    maxBudget: null,
    notes: '',
};

describe('advisor state', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-08-30T12:00:00+08:00'));
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('does not recommend anything until a grade is selected', () => {
        const result = getAdvisorRecommendations([makeCourse()], emptyProfile);
        expect(result.recommendations).toEqual([]);
        expect(result.summary).toContain('請先選擇');
        expect(result.summary).not.toContain('0 門');
    });

    it('supports the location-free grade-four technology/activity example', () => {
        const result = getAdvisorRecommendations([makeCourse({ category: '程式科技足球活動' })], {
            ...emptyProfile,
            grade: 4,
            traits: ['active', 'tech'],
        });
        expect(result.recommendations).toHaveLength(1);
    });
});

describe('analysis representatives', () => {
    it('deduplicates the same course title from the same school', () => {
        const duplicateA = makeCourse({ category: '足球活動', schedule: { startDate: '2026-09-01' } as ReturnType<typeof makeCourse>['schedule'] });
        const duplicateB = makeCourse({ category: '足球活動', schedule: { startDate: '2026-09-08' } as ReturnType<typeof makeCourse>['schedule'] });
        const unique = makeCourse({ category: '籃球活動', source: { courseId: '002' } as ReturnType<typeof makeCourse>['source'] });
        const theme = analyzeCamps([duplicateA, duplicateB, unique]).popularThemes.find((item) => item.representativeCourses.length > 0);
        const keys = theme?.representativeCourses.map((course) => `${course.schoolName}|${course.category}`) ?? [];

        expect(new Set(keys).size).toBe(keys.length);
        expect(keys.filter((key) => key.endsWith('|足球活動'))).toHaveLength(1);
    });

    it('groups related titles and only features genuinely scarce topics', () => {
        const ukuleleCourses = Array.from({ length: 9 }, (_, index) => makeCourse({
            category: index === 0 ? '烏克麗麗初階班' : `烏克麗麗課程 ${index + 1}`,
            courseName: '',
            schoolName: `烏克麗麗學校 ${index + 1}`,
            address: index === 0 ? '建安國小(螢光劇場)' : '新北市',
            source: { courseId: `ukulele-${index}` } as ReturnType<typeof makeCourse>['source'],
        }));
        const rareDramaCourses = ['兒童扮戲初體驗', '樹苗劇場'].map((category, index) => makeCourse({
            category,
            courseName: '',
            source: { courseId: `rare-drama-${index}` } as ReturnType<typeof makeCourse>['source'],
        }));
        const cookingCourses = [
            '料理實驗室',
            '烘焙點心社',
            '點心同學會',
            '甜點小達人',
            '小廚師體驗營',
            '廚藝實作班',
            '快樂廚房',
            '蛋糕手作社',
            '餅乾 DIY',
        ].map((category, index) => makeCourse({
            category,
            courseName: '',
            schoolName: `料理學校 ${index + 1}`,
            source: { courseId: `cooking-${index}` } as ReturnType<typeof makeCourse>['source'],
        }));
        const beadCourses = Array.from({ length: 9 }, (_, index) => makeCourse({
            category: `創意拼豆 ${index + 1}`,
            courseName: '',
            schoolName: `拼豆學校 ${index + 1}`,
            source: { courseId: `bead-${index}` } as ReturnType<typeof makeCourse>['source'],
        }));
        const doctorCourses = Array.from({ length: 6 }, (_, index) => makeCourse({
            category: `小小醫師 ${index + 1}`,
            courseName: '',
            schoolName: `醫師學校 ${index + 1}`,
            source: { courseId: `doctor-${index}` } as ReturnType<typeof makeCourse>['source'],
        }));
        const unrelatedCourse = makeCourse({
            category: '桌遊探索學院',
            courseName: '',
            source: { courseId: 'unrelated' } as ReturnType<typeof makeCourse>['source'],
        });

        const featured = analyzeCamps([
            ...ukuleleCourses,
            ...cookingCourses,
            ...beadCourses,
            ...doctorCourses,
            ...rareDramaCourses,
            unrelatedCourse,
        ]).featuredCamps;
        const featuredDrama = featured.filter((camp) =>
            camp.reasons.some((reason) => reason.includes('戲劇表演'))
        );

        expect(classifyTheme(ukuleleCourses[0]).id).toBe('life-career');
        expect(featured.some((camp) => camp.title.includes('烏克麗麗'))).toBe(false);
        expect(featured.some((camp) => camp.title.includes('料理') || camp.title.includes('烘焙'))).toBe(false);
        expect(featured.some((camp) => camp.title.includes('拼豆'))).toBe(false);
        expect(featured.some((camp) => camp.title.includes('醫師'))).toBe(false);
        expect(featured.some((camp) => camp.title === '桌遊探索學院')).toBe(false);
        expect(featured.flatMap((camp) => camp.reasons).join(' ')).not.toContain('只出現一次');
        expect(featuredDrama).toHaveLength(1);
        expect(featuredDrama[0].reasons).toContain('「戲劇表演」僅 1 校開設（2 門課）');
    });
});
