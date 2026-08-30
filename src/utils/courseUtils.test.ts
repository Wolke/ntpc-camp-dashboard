import { describe, expect, it } from 'vitest';
import { makeCourse } from '../test/courseFactory';
import { getCourseOfficialUrl, getCourseProspectusUrl } from './courseUtils';

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
