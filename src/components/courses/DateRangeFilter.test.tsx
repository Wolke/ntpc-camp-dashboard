import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import type { FilterOptions } from '../../types/course';
import { createDefaultFilters } from '../../utils/courseFilters';
import DateRangeFilter from './DateRangeFilter';

function ControlledDateRange() {
    const [filters, setFilters] = useState(createDefaultFilters());
    const update = (next: Partial<FilterOptions>) => setFilters((current) => ({ ...current, ...next }));
    return <DateRangeFilter filters={filters} onChange={update} />;
}

describe('DateRangeFilter', () => {
    it('starts blank and accepts dates in a future year', () => {
        render(<ControlledDateRange />);
        const start = screen.getByLabelText('開始日期') as HTMLInputElement;
        const end = screen.getByLabelText('結束日期') as HTMLInputElement;

        expect(start.value).toBe('');
        expect(end.value).toBe('');
        expect(start).not.toHaveAttribute('min');
        expect(end).not.toHaveAttribute('max');

        fireEvent.change(start, { target: { value: '2027-01-12' } });
        expect(start.value).toBe('2027-01-12');
    });

    it('normalizes a reversed end date instead of keeping an invalid range', () => {
        render(<ControlledDateRange />);
        const start = screen.getByLabelText('開始日期') as HTMLInputElement;
        const end = screen.getByLabelText('結束日期') as HTMLInputElement;

        fireEvent.change(start, { target: { value: '2026-08-20' } });
        fireEvent.change(end, { target: { value: '2026-08-10' } });

        expect(start.value).toBe('2026-08-10');
        expect(end.value).toBe('2026-08-10');
    });
});
