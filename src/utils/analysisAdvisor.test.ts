import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeCourse } from '../test/courseFactory';
import { analyzeCamps } from './campAnalysis';
import { type AdvisorProfile, getAdvisorRecommendations } from './aiAdvisor';

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
});
