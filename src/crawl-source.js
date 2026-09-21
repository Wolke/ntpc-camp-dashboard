import { readFileSync } from 'node:fs';

function isValidSourceData(data, type) {
    return data && Number.isFinite(Date.parse(data.lastUpdated))
        && Array.isArray(data.courses)
        && data.courses.every((course) => course.source?.type === type);
}

// A supplemental source outage must not discard successfully crawled NTPC data.
// Keep the original timestamp on cached data so it is never presented as fresh.
export async function crawlWithFallback({ crawl, cachePath, type, name }) {
    try {
        const data = await crawl();
        if (!isValidSourceData(data, type)) throw new Error('Invalid source data');
        return {
            data,
            status: { type, name, status: 'updated', lastUpdated: data.lastUpdated, courseCount: data.courses.length },
        };
    } catch (error) {
        console.warn(`⚠️ ${name}更新失敗：${error.message}`);
        let data = null;
        try {
            const cached = JSON.parse(readFileSync(cachePath, 'utf8'));
            if (isValidSourceData(cached, type)) data = cached;
        } catch {
            // Missing or corrupt cache: report unavailable without inventing data.
        }
        return {
            data,
            status: {
                type,
                name,
                status: data ? 'cached' : 'unavailable',
                lastUpdated: data?.lastUpdated ?? null,
                courseCount: data?.courses.length ?? 0,
            },
        };
    }
}
