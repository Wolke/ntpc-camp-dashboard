import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useCourseStore } from '../../store/courseStore';

export default function SearchBar() {
    const { filters, setFilters } = useCourseStore();
    const [inputValue, setInputValue] = useState(filters.searchQuery);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setFilters({ searchQuery: inputValue });
        }, 300);

        return () => window.clearTimeout(timeoutId);
    }, [inputValue, setFilters]);

    const handleClear = () => {
        setInputValue('');
    };

    return (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <label className="mb-2 block text-sm font-semibold text-slate-800">搜尋課程</label>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="搜尋學校、課程、老師、地址..."
                    className="w-full rounded-md border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
                {inputValue && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 hover:bg-slate-100"
                    >
                        <X className="h-4 w-4 text-slate-400" />
                    </button>
                )}
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
                {['開放外校', '免費', '暑假', '美術'].map((tag) => (
                    <button
                        key={tag}
                        type="button"
                        onClick={() => setInputValue(tag)}
                        className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200"
                    >
                        {tag}
                    </button>
                ))}
            </div>
        </section>
    );
}
