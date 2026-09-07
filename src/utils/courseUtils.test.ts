import { describe, expect, it } from 'vitest';
import { makeCourse } from '../test/courseFactory';
import { formatGradeSummary, formatScheduleParts, getCourseOfficialUrl, getCourseProspectusUrl } from './courseUtils';

describe('official course links', () => {
    it('builds the NTPC detail URL used by the current official endpoint', () => {
        const course = makeCourse({
            source: { schoolId: '014604', actId: '00098', courseId: '001' } as ReturnType<typeof makeCourse>['source'],
            urls: {
                detail: 'https://camp.ntpc.edu.tw/obsolete',
            },
        });

        const url = new URL(getCourseOfficialUrl(course)!);
        expect(url.pathname).toBe('/jsp/act_register/ACTClsAction.do');
        expect(Object.fromEntries(url.searchParams)).toMatchObject({
            method: 'ActCls_Ctn',
            status: 'index_detail_outquery',
            req_schno: '014604',
            actmang_no: '00098',
            actcls_no: '001',
        });
    });

    it('hides guessed legacy PDFs and keeps brochures extracted from the official listing', () => {
        const guessed = makeCourse({
            urls: { prospectus: 'https://camp.ntpc.edu.tw/central/014604/uploadfile/act_register/public/file/00098-001-clsfile.PDF' },
        });
        const official = makeCourse({
            urls: { prospectus: 'https://camp.ntpc.edu.tw/central/db2admin/uploadfile/ntpc_actregister/public/014517_202608192137.PDF' },
        });

        expect(getCourseProspectusUrl(guessed)).toBeUndefined();
        expect(getCourseProspectusUrl(official)).toContain('/ntpc_actregister/public/');
    });
});

describe('compact course card formatting', () => {
    it('compresses contiguous grades without joining school levels', () => {
        expect(formatGradeSummary([1, 2, 3, 4, 5, 6])).toBe('小一–小六');
        expect(formatGradeSummary([5, 6, 7, 8])).toBe('小五–小六、國一–國二');
    });

    it('only shows week labels for courses lasting at most seven days', () => {
        const shortCourse = makeCourse({ schedule: { startDate: '2026-09-01', endDate: '2026-09-07' } as ReturnType<typeof makeCourse>['schedule'] });
        const longCourse = makeCourse({ schedule: { startDate: '2026-09-01', endDate: '2027-01-15' } as ReturnType<typeof makeCourse>['schedule'] });
        expect(formatScheduleParts(shortCourse).weekSummary).not.toBe('');
        expect(formatScheduleParts(longCourse).weekSummary).toBe('');
    });
});
