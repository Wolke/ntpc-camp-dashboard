import { create } from 'zustand';
import type { FilterOptions } from '../types/course';
import { createDefaultFilters } from '../utils/courseFilters';

interface CourseStore {
    filters: FilterOptions;
    selectedSchool: string | null;
    setFilters: (filters: Partial<FilterOptions>) => void;
    replaceFilters: (filters: FilterOptions) => void;
    setSelectedSchool: (school: string | null) => void;
    resetFilters: () => void;
}

export const useCourseStore = create<CourseStore>((set) => ({
    filters: createDefaultFilters(),
    selectedSchool: null,
    setFilters: (newFilters) => set((state) => ({ filters: { ...state.filters, ...newFilters } })),
    replaceFilters: (filters) => set({ filters }),
    setSelectedSchool: (selectedSchool) => set({ selectedSchool }),
    resetFilters: () => set({ filters: createDefaultFilters(), selectedSchool: null }),
}));
