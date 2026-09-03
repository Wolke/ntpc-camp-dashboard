import { describe, expect, it } from 'vitest';
import { SCHOOL_COORDINATES } from './schoolCoordinates';

describe('school coordinates', () => {
    it('maps every NTPC school currently present in the course data', async () => {
        const courseData = await import('../../data/courses.json');
        const ntpcSchoolNames = Array.from(new Set(
            courseData.default.courses
                .filter((course) => course.source.type === 'ntpc_camp' || course.source.type === 'ntpc_school_activity')
                .map((course) => course.schoolName),
        ));

        expect(ntpcSchoolNames.length).toBeGreaterThanOrEqual(74);
        expect(ntpcSchoolNames.filter((schoolName) => !SCHOOL_COORDINATES[schoolName])).toEqual([]);
        expect(SCHOOL_COORDINATES['新北市土城區土城國民小學']).toEqual([24.972389, 121.441931]);
    });
});
