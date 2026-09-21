import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SourceUpdateWarnings from './SourceUpdateWarnings';

describe('source update warnings', () => {
    it('shows the cached source date instead of claiming every source is fresh', () => {
        render(<SourceUpdateWarnings sources={[{
            type: 'taipei_holiday', name: '臺北市暑期體驗營', status: 'cached',
            lastUpdated: '2026-09-08T02:13:33Z', courseCount: 12,
        }]} />);
        expect(screen.getByRole('status')).toHaveTextContent('臺北市暑期體驗營：暫時無法更新');
        expect(screen.getByRole('status')).toHaveTextContent('2026/9/8');
        expect(screen.getByRole('status')).toHaveTextContent('12 門課程');
    });

    it('explains missing source data without displaying a fabricated date', () => {
        render(<SourceUpdateWarnings sources={[{
            type: 'taipei_holiday', name: '臺北市暑期體驗營', status: 'unavailable',
            lastUpdated: null, courseCount: 0,
        }]} />);
        expect(screen.getByRole('status')).toHaveTextContent('本次未包含此來源的課程');
    });

    it('does not show a warning for legacy data or successful sources', () => {
        const { rerender } = render(<SourceUpdateWarnings />);
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
        rerender(<SourceUpdateWarnings sources={[{
            type: 'taipei_holiday', name: '臺北市暑期體驗營', status: 'updated',
            lastUpdated: '2026-09-21T02:30:00Z', courseCount: 12,
        }]} />);
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
});
