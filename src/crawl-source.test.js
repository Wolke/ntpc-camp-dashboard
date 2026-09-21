// @vitest-environment node
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { crawlWithFallback } from './crawl-source.js';

const source = { type: 'taipei_holiday', name: '臺北市國民小學暑期體驗營' };
const oldData = {
    lastUpdated: '2026-09-08T02:13:33.716Z',
    courses: [{ source: { type: 'taipei_holiday' }, courseName: '體驗營' }],
};
let directory;
let cachePath;

beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'ntpc-crawl-test-'));
    cachePath = join(directory, 'taipei-courses.json');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => rmSync(directory, { recursive: true, force: true }));

describe('supplemental source outages', () => {
    it('returns newly fetched data after the source recovers', async () => {
        writeFileSync(cachePath, JSON.stringify(oldData));
        const fresh = { ...oldData, lastUpdated: '2026-09-21T02:30:00.000Z' };
        const result = await crawlWithFallback({ ...source, cachePath, crawl: async () => fresh });
        expect(result.data).toEqual(fresh);
        expect(result.status).toMatchObject({ status: 'updated', lastUpdated: fresh.lastUpdated, courseCount: 1 });
    });

    it('preserves the original data and timestamp when Taipei refuses the connection', async () => {
        writeFileSync(cachePath, JSON.stringify(oldData));
        const result = await crawlWithFallback({ ...source, cachePath, crawl: async () => { throw new Error('ECONNREFUSED'); } });
        expect(result.data).toEqual(oldData);
        expect(result.status).toMatchObject({ status: 'cached', lastUpdated: oldData.lastUpdated, courseCount: 1 });
        expect(JSON.parse(readFileSync(cachePath, 'utf8'))).toEqual(oldData);
    });

    it.each(['missing', 'invalid JSON', 'invalid date', 'wrong source'])('reports unavailable for a %s cache without blocking NTPC', async (scenario) => {
        if (scenario === 'invalid JSON') writeFileSync(cachePath, '{');
        if (scenario === 'invalid date') writeFileSync(cachePath, JSON.stringify({ ...oldData, lastUpdated: 'unknown' }));
        if (scenario === 'wrong source') writeFileSync(cachePath, JSON.stringify({ ...oldData, courses: [{ source: { type: 'ntpc_camp' } }] }));
        const result = await crawlWithFallback({ ...source, cachePath, crawl: async () => { throw new Error('ECONNREFUSED'); } });
        expect(result.data).toBeNull();
        expect(result.status).toMatchObject({ status: 'unavailable', lastUpdated: null, courseCount: 0 });
    });

    it('keeps a previously successful empty result, including its original date', async () => {
        writeFileSync(cachePath, JSON.stringify({ ...oldData, courses: [] }));
        const result = await crawlWithFallback({ ...source, cachePath, crawl: async () => { throw new Error('ECONNREFUSED'); } });
        expect(result.status).toMatchObject({ status: 'cached', lastUpdated: oldData.lastUpdated, courseCount: 0 });
    });
});

it('exits unsuccessfully on a fatal crawler error and leaves existing course data intact', () => {
    const existing = readFileSync('data/courses.json', 'utf8');
    const result = spawnSync(process.execPath, ['src/index.js'], {
        env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: directory },
        encoding: 'utf8',
        timeout: 15000,
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Executable doesn't exist");
    expect(readFileSync('data/courses.json', 'utf8')).toBe(existing);
});
