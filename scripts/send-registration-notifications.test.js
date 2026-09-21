// @vitest-environment node
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeCourse } from '../src/test/courseFactory';
import { createDefaultFilters } from '../src/utils/courseFilters';
import { normalizeNotificationPreferences } from '../src/utils/notificationPreferences';
import { assertFreshCourseData, buildDeliveryPlans, coursesOpeningOn, deliverPlans, deliveryKey, loadSubscribers, main, normalizeSubscribers, renderNotification, taipeiDateKey } from './send-registration-notifications';

const monday = '2026-09-21';
const now = new Date('2026-09-21T08:00:00+08:00');
const base = makeCourse();
const soccer = makeCourse({
    category: '足球',
    address: '新北市板橋區',
    schedule: { ...base.schedule, startDate: '2026-09-28', endDate: '2026-10-05', weekday: '週一' },
    registration: { ...base.registration, startTime: '2026-09-21T09:00:00+08:00', endTime: '2026-09-27T17:00:00+08:00' },
    _raw: {},
});
const art = makeCourse({ ...soccer, category: '美術', courseName: '', fee: { isFree: false, amount: 200, description: '200 元' } });
function subscriber(email, frequency, filters = {}) {
    return { email, preferences: { schemaVersion: 1, frequency, filters: { ...createDefaultFilters(), ...filters } } };
}

afterEach(() => vi.unstubAllGlobals());

describe('personalized notification planning', () => {
    it('sends each subscriber only matching courses using the dashboard filters', () => {
        const subscribers = normalizeSubscribers([
            subscriber('soccer@example.com', 'weekly', { searchQuery: '足球', grades: [3, 4], district: '新北市板橋區', isFree: true, allowExternalStudents: true, weekdays: ['週一'] }),
            subscriber('art@example.com', 'weekly', { themeIds: ['arts-craft'], isFree: false }),
            subscriber('empty@example.com', 'weekly', { schoolName: '不符合的學校' }),
        ]);
        const plans = buildDeliveryPlans([soccer, art], subscribers, { dateKey: monday, now });
        expect(plans.map((plan) => [plan.email, plan.courses.map((course) => course.category)])).toEqual([
            ['soccer@example.com', ['足球']], ['art@example.com', ['美術']],
        ]);
    });

    it('uses Monday in Taipei, keeps daily independent, and respects both frequencies', () => {
        const subscribers = normalizeSubscribers([
            subscriber('weekly@example.com', 'weekly'), subscriber('daily@example.com', 'daily'), subscriber('both@example.com', 'both'),
        ]);
        expect(taipeiDateKey(new Date('2026-09-20T16:01:00Z'))).toBe(monday);
        const plans = buildDeliveryPlans([soccer], subscribers, { dateKey: monday, now });
        expect(plans.map((plan) => `${plan.email}:${plan.kind}`)).toEqual([
            'weekly@example.com:weekly', 'daily@example.com:daily', 'both@example.com:weekly', 'both@example.com:daily',
        ]);
        expect(buildDeliveryPlans([soccer], subscribers, { dateKey: '2026-09-22' })).toHaveLength(0);
        expect(buildDeliveryPlans([soccer], subscribers, { dateKey: '2026-09-22', mode: 'weekly' })).toHaveLength(2);
    });

    it('does not send ended courses or dates and weekdays outside subscribed conditions', () => {
        const subscribers = normalizeSubscribers([
            subscriber('ended@example.com', 'weekly'),
            subscriber('date@example.com', 'weekly', { dateRange: { start: '2027-01-01', end: null } }),
            subscriber('weekday@example.com', 'weekly', { weekdays: ['週二'] }),
        ]);
        expect(buildDeliveryPlans([base], subscribers, { dateKey: monday, now })).toEqual([]);
        expect(buildDeliveryPlans([soccer], subscribers.slice(1), { dateKey: monday, now })).toEqual([]);
    });

    it('treats invalid registration dates as nonmatches and compares dates in Taipei', () => {
        const midnight = { ...soccer, registration: { ...soccer.registration, startTime: '2026-09-20T16:00:00Z' } };
        const invalid = { ...soccer, registration: { startTime: 'invalid' } };
        expect(coursesOpeningOn([midnight, invalid, { registration: {} }], monday)).toEqual([midnight]);
    });

    it('rejects stale data and invalid target dates', () => {
        expect(() => assertFreshCourseData({ courses: [soccer], lastUpdated: '2026-09-20T14:00:00Z' }, monday)).toThrow(/not updated/);
        expect(() => assertFreshCourseData({ courses: [soccer], lastUpdated: '2026-09-21T00:10:00Z' }, monday)).not.toThrow();
        expect(() => buildDeliveryPlans([], [], { dateKey: '2026-02-30' })).toThrow(/TARGET_DATE/);
        expect(() => buildDeliveryPlans([], [], { dateKey: monday, mode: 'invalid' })).toThrow(/MODE/);
    });
});

describe('subscriber compatibility and validation', () => {
    it('retains daily behavior for old emails and preserves latest preferences without duplicates', () => {
        const result = normalizeSubscribers({ subscribers: [
            '  PARENT@example.com ', { email: 'legacy@example.com' }, subscriber('parent@example.com', 'weekly', { grades: [3] }),
        ] });
        expect(result).toHaveLength(2);
        expect(result.find((row) => row.email === 'legacy@example.com').preferences).toMatchObject({ frequency: 'daily', filters: { courseTimeStatus: [] } });
        expect(result.find((row) => row.email === 'parent@example.com').preferences).toMatchObject({ frequency: 'weekly', filters: { grades: [3] } });
    });

    it('skips inactive, malformed and invalid preference rows without widening conditions', () => {
        const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(normalizeSubscribers([
            subscriber('inactive@example.com', 'weekly'), { email: 'inactive@example.com', active: false },
            { email: 'bad@example.com', preferences: { frequency: 'weekly', filters: { grades: [99] } } },
            { email: 'corrupt@example.com', preferences: null }, null, {}, 'not-email', 'a@example.com,b@example.com',
        ])).toEqual([]);
        expect(warning).toHaveBeenCalled();
        expect(() => normalizeSubscribers({})).toThrow(/subscriber list/);
    });

    it.each([
        { weekdays: ['Friday'] }, { isFree: 'true' }, { themeIds: ['unknown'] },
        { dateRange: { start: '2026-02-30' } }, { dateRange: { start: '2026-10-01', end: '2026-09-01' } }, { typo: true },
    ])('rejects unsupported or malformed filters: %j', (filters) => {
        expect(() => normalizeNotificationPreferences({ frequency: 'weekly', filters })).toThrow();
    });

    it('loads preferences from the endpoint and refuses endpoint failures', async () => {
        const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, subscribers: [subscriber('api@example.com', 'weekly')] }) });
        vi.stubGlobal('fetch', fetch);
        expect((await loadSubscribers({ SUBSCRIBERS_JSON_URL: 'https://example.com/private' }))[0].preferences.frequency).toBe('weekly');
        fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: false, error: 'unauthorized' }) });
        await expect(loadSubscribers({ SUBSCRIBERS_JSON_URL: 'https://example.com/private' })).rejects.toThrow(/authorize/);
        fetch.mockClear();
        await loadSubscribers({ SUBSCRIBERS_JSON: '[]', SUBSCRIBERS_JSON_URL: 'https://example.com/private' });
        expect(fetch).not.toHaveBeenCalled();
    });
});

describe('email delivery and retry', () => {
    const plans = () => buildDeliveryPlans([soccer, art], normalizeSubscribers([
        subscriber('one@example.com', 'weekly', { searchQuery: '足球' }), subscriber('two@example.com', 'weekly', { searchQuery: '美術' }),
    ]), { dateKey: monday, now });

    it('sends individually, persists successes and retries only failed recipients', async () => {
        const state = {};
        const sendMail = vi.fn().mockResolvedValueOnce({ accepted: ['one@example.com'] }).mockRejectedValueOnce(new Error('failure'));
        const saveState = vi.fn();
        const options = { from: 'notice@example.com', sendMail, state, secret: 'test-secret', saveState, lastUpdated: now.toISOString() };
        expect(await deliverPlans(plans(), options)).toEqual({ sent: 1, skipped: 0, failed: 1 });
        expect(saveState).toHaveBeenCalledTimes(1);
        expect(sendMail.mock.calls[0][0]).toMatchObject({ to: { address: 'one@example.com' } });
        expect(sendMail.mock.calls[0][0]).not.toHaveProperty('bcc');
        expect(sendMail.mock.calls[0][0].text).toContain('足球');
        expect(sendMail.mock.calls[0][0].text).not.toContain('美術');
        expect(JSON.stringify(state)).not.toContain('@');
        sendMail.mockResolvedValue({ accepted: ['two@example.com'] });
        expect(await deliverPlans(plans(), options)).toEqual({ sent: 1, skipped: 1, failed: 0 });
        expect(await deliverPlans(plans(), options)).toEqual({ sent: 0, skipped: 2, failed: 0 });
    });

    it('does not record rejected recipients and distinguishes dates and modes', async () => {
        const state = {};
        const saveState = vi.fn();
        expect(await deliverPlans(plans().slice(0, 1), { sendMail: async () => ({ accepted: [] }), state, secret: 'secret', saveState })).toEqual({ sent: 0, skipped: 0, failed: 1 });
        expect(saveState).not.toHaveBeenCalled();
        const plan = plans()[0];
        expect(deliveryKey(plan, 'secret')).not.toBe(deliveryKey({ ...plan, kind: 'daily' }, 'secret'));
        expect(deliveryKey(plan, 'secret')).not.toBe(deliveryKey({ ...plan, dateKey: '2026-09-28' }, 'secret'));
    });

    it('escapes course and filter text and omits unsafe links', () => {
        const plan = plans()[0];
        plan.preferences.filters.searchQuery = '<script>alert(1)</script>';
        plan.courses = [{ ...soccer, category: '<img src=x onerror=alert(1)>', source: { type: 'other' }, urls: { detail: 'javascript:alert(1)', prospectus: 'data:text/html,bad' } }];
        const result = renderNotification(plan, now.toISOString());
        expect(result.html).toContain('&lt;img');
        expect(result.html).toContain('&lt;script&gt;');
        expect(result.html).not.toContain('href="javascript:');
        expect(result.html).not.toContain('href="data:');
        expect(result.text).toContain('報名期間');
    });

    it('dry-run previews matching courses without SMTP or a delivery record', async () => {
        const directory = mkdtempSync(join(tmpdir(), 'camp-notifications-'));
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});
        try {
            const coursesFile = join(directory, 'courses.json');
            writeFileSync(coursesFile, JSON.stringify({ lastUpdated: now.toISOString(), courses: [soccer] }));
            await main({ DRY_RUN: 'true', TARGET_DATE: monday, COURSES_FILE: coursesFile, SUBSCRIBERS_JSON: JSON.stringify([subscriber('dry@example.com', 'weekly')]) });
            expect(log.mock.calls.flat().join('\n')).toContain('[DRY RUN] 1 personalized emails');
            expect(log.mock.calls.flat().join('\n')).not.toContain('dry@example.com');
            await expect(main({ TARGET_DATE: '2026-09-22', COURSES_FILE: coursesFile, SUBSCRIBERS_JSON: JSON.stringify([subscriber('dry@example.com', 'weekly')]) })).rejects.toThrow(/not updated/);
        } finally { rmSync(directory, { recursive: true, force: true }); }
    });
});
