// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

it('publishes only public course files and removes previously copied private data', () => {
    const directory = mkdtempSync(join(tmpdir(), 'camp-public-data-'));
    try {
        mkdirSync(join(directory, 'data'));
        mkdirSync(join(directory, 'dist/data'), { recursive: true });
        const publicFiles = ['courses.json', 'external-courses.json', 'taipei-courses.json', 'unindexed-activities.json'];
        for (const name of [...publicFiles, 'subscribers.json']) writeFileSync(join(directory, 'data', name), '{}');
        writeFileSync(join(directory, 'dist/data/subscribers.json'), '{}');
        execFileSync(process.execPath, [fileURLToPath(new URL('./copy-public-data.js', import.meta.url))], { cwd: directory });
        expect(readdirSync(join(directory, 'dist/data')).sort()).toEqual(publicFiles.sort());
    } finally { rmSync(directory, { recursive: true, force: true }); }
});
