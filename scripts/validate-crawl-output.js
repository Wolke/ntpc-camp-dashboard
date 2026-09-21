import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function validateCrawlOutput(data, startedAt, now = new Date()) {
    const started = Date.parse(startedAt);
    const updated = Date.parse(data?.lastUpdated);
    if (!Number.isFinite(started) || !Number.isFinite(updated)
        || updated < started || updated > now.getTime()) {
        throw new Error('Course data was not updated during this crawl.');
    }
    if (!Array.isArray(data.courses) || data.stats?.total !== data.courses.length) {
        throw new Error('Course data count does not match its metadata.');
    }
    if (!Array.isArray(data.sourceStatus) || !data.sourceStatus.some((source) =>
        source.type === 'ntpc_camp' && source.status === 'updated'
        && Date.parse(source.lastUpdated) >= started
        && Date.parse(source.lastUpdated) <= updated)) {
        throw new Error('No successful NTPC source update in this crawl.');
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const data = JSON.parse(readFileSync('data/courses.json', 'utf8'));
    validateCrawlOutput(data, process.argv[2]);
    console.log(`Verified crawl output: ${data.courses.length} courses updated at ${data.lastUpdated}`);
}
