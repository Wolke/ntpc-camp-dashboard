// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { validateCrawlOutput } from './validate-crawl-output.js';

const startedAt = '2026-09-21T02:29:00Z';
const now = new Date('2026-09-21T02:32:00Z');
const data = {
    lastUpdated: '2026-09-21T02:31:00Z',
    stats: { total: 1 },
    courses: [{}],
    sourceStatus: [
        { type: 'ntpc_camp', status: 'updated', lastUpdated: '2026-09-21T02:30:00Z' },
        { type: 'taipei_holiday', status: 'cached', lastUpdated: '2026-09-08T02:13:33Z' },
    ],
};

describe('crawl output validation', () => {
    it('accepts fresh NTPC data with explicitly cached Taipei data', () => {
        expect(() => validateCrawlOutput(data, startedAt, now)).not.toThrow();
    });

    it('rejects the September 8 data even if an error screenshot changed', () => {
        expect(() => validateCrawlOutput({ ...data, lastUpdated: '2026-09-08T02:13:33Z' }, startedAt, now)).toThrow('not updated');
    });

    it('rejects a changed output timestamp without a successful source update', () => {
        expect(() => validateCrawlOutput({ ...data, sourceStatus: [] }, startedAt, now)).toThrow('No successful');
    });

    it('rejects incorrect counts and invalid or future dates', () => {
        expect(() => validateCrawlOutput({ ...data, stats: { total: 2 } }, startedAt, now)).toThrow('count');
        expect(() => validateCrawlOutput({ ...data, lastUpdated: 'invalid' }, startedAt, now)).toThrow('not updated');
        expect(() => validateCrawlOutput({ ...data, lastUpdated: '2026-09-22T00:00:00Z' }, startedAt, now)).toThrow('not updated');
    });
});
