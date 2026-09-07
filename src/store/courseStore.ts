import { create } from 'zustand';
import type { FilterOptions } from '../types/course';
import { createDefaultFilters, type CourseSortMode } from '../utils/courseFilters';

interface CourseStore {
    filters: FilterOptions;
    sortMode: CourseSortMode;
    setFilters: (filters: Partial<FilterOptions>) => void;
    replaceFilters: (filters: FilterOptions) => void;
    setSortMode: (sortMode: CourseSortMode) => void;
    replaceSearchState: (filters: FilterOptions, sortMode: CourseSortMode) => void;
    resetFilters: () => void;
    resetSearchState: () => void;
}

export const useCourseStore = create<CourseStore>((set) => ({
    filters: createDefaultFilters(),
    sortMode: 'actionable',
    setFilters: (newFilters) => set((state) => ({ filters: { ...state.filters, ...newFilters } })),
    replaceFilters: (filters) => set({ filters }),
    setSortMode: (sortMode) => set({ sortMode }),
    replaceSearchState: (filters, sortMode) => set({ filters, sortMode }),
    resetFilters: () => set({ filters: createDefaultFilters() }),
    resetSearchState: () => set({ filters: createDefaultFilters(), sortMode: 'actionable' }),
}));
