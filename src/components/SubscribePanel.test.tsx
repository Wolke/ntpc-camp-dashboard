import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultFilters } from '../utils/courseFilters';
import SubscribePanel from './SubscribePanel';

beforeEach(() => {
    vi.stubEnv('VITE_SUBSCRIBE_ENDPOINT', 'https://example.com/subscribe');
    vi.stubEnv('VITE_SUBSCRIBE_CONTACT_EMAIL', '');
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

function submit() {
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'Parent@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: '訂閱／更新通知' }));
}

describe('custom email subscription', () => {
    it('defaults to Monday digest and saves a snapshot of every current condition even with no matches', async () => {
        const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, preferencesSaved: true }) });
        vi.stubGlobal('fetch', fetch);
        const filters = { ...createDefaultFilters(), searchQuery: '籃球', grades: [3], weekdays: ['週一' as const], isFree: true };
        render(<SubscribePanel filters={filters} courses={[]} />);
        expect(screen.getByLabelText('通知頻率')).toHaveValue('weekly');
        expect(screen.getByText(/目前符合 0 門/)).toBeVisible();
        submit();
        await waitFor(() => expect(screen.getByText(/已儲存「每週一課程更新摘要」/)).toBeVisible());
        const payload = JSON.parse(fetch.mock.calls[0][1].body);
        expect(payload.email).toBe('parent@example.com');
        expect(payload.preferences).toEqual({ schemaVersion: 1, frequency: 'weekly', filters });
        expect(screen.getByLabelText('Email')).toHaveValue('');
    });

    it('lets subscribers keep both daily and weekly notifications', async () => {
        const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, preferencesSaved: true }) });
        vi.stubGlobal('fetch', fetch);
        render(<SubscribePanel filters={createDefaultFilters()} courses={[]} />);
        fireEvent.change(screen.getByLabelText('通知頻率'), { target: { value: 'both' } });
        submit();
        await waitFor(() => expect(fetch).toHaveBeenCalled());
        expect(JSON.parse(fetch.mock.calls[0][1].body).preferences.frequency).toBe('both');
    });

    it('does not claim preferences were saved by an old email-only endpoint', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }));
        render(<SubscribePanel filters={createDefaultFilters()} courses={[]} />);
        submit();
        await waitFor(() => expect(screen.getByText(/無法確認訂閱條件已儲存/)).toBeVisible());
        expect(screen.getByLabelText('Email')).toHaveValue('Parent@example.com');
    });

    it('explains that a GAS opaque response cannot confirm storage and includes preferences', async () => {
        vi.stubEnv('VITE_SUBSCRIBE_ENDPOINT', 'https://script.google.com/macros/s/example/exec');
        const fetch = vi.fn().mockResolvedValue({ type: 'opaque' });
        vi.stubGlobal('fetch', fetch);
        render(<SubscribePanel filters={createDefaultFilters()} courses={[]} />);
        submit();
        await waitFor(() => expect(screen.getByText(/瀏覽器無法確認伺服器是否成功儲存/)).toBeVisible());
        expect(fetch.mock.calls[0][1].mode).toBe('no-cors');
        expect(JSON.parse(fetch.mock.calls[0][1].body).preferences.frequency).toBe('weekly');
    });

    it('keeps the input on network failure and blocks subscribing before courses load', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
        const { rerender } = render(<SubscribePanel filters={createDefaultFilters()} courses={[]} isLoading />);
        expect(screen.getByRole('button', { name: '訂閱／更新通知' })).toBeDisabled();
        rerender(<SubscribePanel filters={createDefaultFilters()} courses={[]} />);
        submit();
        await waitFor(() => expect(screen.getByText(/無法確認訂閱條件已儲存/)).toBeVisible());
        expect(screen.getByLabelText('Email')).toHaveValue('Parent@example.com');
    });
});
