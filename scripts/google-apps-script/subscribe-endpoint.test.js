// @vitest-environment node
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultFilters } from '../../src/utils/courseFilters';
import { normalizeNotificationPreferences } from '../../src/utils/notificationPreferences';

const script = readFileSync(new URL('./subscribe-endpoint.gs', import.meta.url), 'utf8');

function endpoint(initialRows = [['email', 'source', 'createdAt']]) {
    const rows = initialRows.map((row) => [...row]);
    const lock = { waitLock: vi.fn(), releaseLock: vi.fn() };
    const sheet = {
        getDataRange: () => ({ getValues: () => rows.map((row) => [...row]) }),
        appendRow: (row) => rows.push(row),
        getRange: (startRow, startColumn) => ({
            setValues: (values) => values.forEach((row, i) => row.forEach((value, j) => {
                rows[startRow - 1 + i] ??= [];
                rows[startRow - 1 + i][startColumn - 1 + j] = value;
            })),
        }),
    };
    const context = vm.createContext({
        PropertiesService: { getScriptProperties: () => ({ getProperty: (key) => key === 'SUBSCRIBERS_API_TOKEN' ? 'private-token' : null }) },
        SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => sheet }) },
        LockService: { getScriptLock: () => lock },
        ContentService: { createTextOutput: (text) => ({ setMimeType: () => JSON.parse(text) }), MimeType: { JSON: 'json' } },
    });
    vm.runInContext(script, context);
    return { rows, lock, post: (payload) => context.doPost({ postData: { contents: JSON.stringify(payload) } }), get: (token = 'private-token') => context.doGet({ parameter: { token } }) };
}

const preferences = { schemaVersion: 1, frequency: 'weekly', filters: { ...createDefaultFilters(), grades: [3], weekdays: ['週一'], isFree: true } };

describe('Apps Script subscriber storage', () => {
    it('migrates the existing sheet and updates the same email without adding a duplicate', () => {
        const api = endpoint([['email', 'source', 'createdAt'], ['parent@example.com', 'original', 'original-date']]);
        expect(api.post({ email: 'PARENT@example.com', preferences })).toEqual({ ok: true, duplicate: true, preferencesSaved: true });
        expect(api.rows).toHaveLength(2);
        expect(api.rows[1].slice(0, 3)).toEqual(['parent@example.com', 'original', 'original-date']);
        expect(api.rows[0]).toEqual(['email', 'source', 'createdAt', 'preferences', 'updatedAt', 'active']);
        const result = api.get().subscribers[0];
        expect(normalizeNotificationPreferences(result.preferences)).toEqual(preferences);
        expect(api.lock.waitLock).toHaveBeenCalledWith(10000);
        expect(api.lock.releaseLock).toHaveBeenCalledTimes(1);
    });

    it('exports legacy rows without preferences, honors opt-out, and preserves preferences on legacy resubmission', () => {
        const api = endpoint([['email', 'source', 'createdAt'], ['old@example.com', '', '']]);
        expect(api.get().subscribers[0]).not.toHaveProperty('preferences');
        api.post({ email: 'new@example.com', preferences });
        api.post({ email: 'new@example.com' });
        expect(api.get().subscribers[1].preferences.frequency).toBe('weekly');
        api.rows[2][5] = false;
        expect(api.get().subscribers[1].active).toBe(false);
    });

    it('rejects malformed preferences and never downgrades corrupt saved conditions to daily all-course mail', () => {
        const api = endpoint();
        expect(api.post({ email: 'parent@example.com', preferences: { frequency: 'weekly', filters: { grades: ['3'] } } }).ok).toBe(false);
        expect(api.post({ email: 'parent@example.com', preferences: { frequency: 'weekly', filters: { unknown: true } } }).ok).toBe(false);
        expect(api.rows).toHaveLength(1);
        api.rows.push(['corrupt@example.com', '', '', '{invalid json', '', true]);
        expect(api.get().subscribers[0].preferences).toBeNull();
    });

    it('requires the export token and rejects header injection', () => {
        const api = endpoint();
        expect(api.get('wrong')).toEqual({ ok: false, error: 'unauthorized' });
        expect(api.post({ email: 'test@example.com\nBcc:other@example.com', preferences }).ok).toBe(false);
        expect(api.rows).toHaveLength(1);
    });
});
