const STALE_AFTER_MS = 8 * 24 * 60 * 60 * 1000;

export function isCourseDataStale(lastUpdated: string | undefined, now = new Date()): boolean {
    if (!lastUpdated) return false;
    const updatedAt = new Date(lastUpdated);
    if (Number.isNaN(updatedAt.getTime())) return true;
    return now.getTime() - updatedAt.getTime() > STALE_AFTER_MS;
}
