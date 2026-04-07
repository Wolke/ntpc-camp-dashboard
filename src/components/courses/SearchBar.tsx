import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { useCourseStore } from '../../store/courseStore';

export default function SearchBar() {
    const { filters, setFilters } = useCourseStore();
    const [inputValue, setInputValue] = useState(filters.searchQuery);

    // Debounced search
    const handleSearch = (value: string) => {
        setInputValue(value);
        // 使用 setTimeout 實現 debounce
        const timeoutId = setTimeout(() => {
            setFilters({ searchQuery: value });
        }, 300);

        return () => clearTimeout(timeoutId);
    };

    const handleClear = () => {
        setInputValue('');
        setFilters({ searchQuery: '' });
    };

    return (
        <div className="relative">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="搜尋學校、課程、老師、地址..."
                    className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
                />
                {inputValue && (
                    <button
                        onClick={handleClear}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
                    >
                        <X className="h-4 w-4 text-gray-400" />
                    </button>
                )}
            </div>

            {/* 搜尋建議標籤 */}
            <div className="flex flex-wrap gap-2 mt-2">
                {['免費', 'AI', '烘焙', '程式', '美術'].map((tag) => (
                    <button
                        key={tag}
                        onClick={() => handleSearch(tag)}
                        className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-colors"
                    >
                        {tag}
                    </button>
                ))}
            </div>
        </div>
    );
}
