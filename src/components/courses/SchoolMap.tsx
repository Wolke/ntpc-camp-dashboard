import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Search, X } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import type { Course } from '../../types/course';
import { useCourseStore } from '../../store/courseStore';
import { getSchoolType } from '../../utils/courseFilters';
import { SCHOOL_COORDINATES } from '../../utils/schoolCoordinates';

// 修復 Leaflet 預設圖標問題
type LeafletDefaultIconPrototype = L.Icon.Default & {
    _getIconUrl?: unknown;
};

delete (L.Icon.Default.prototype as LeafletDefaultIconPrototype)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// 學校類型顏色
const schoolTypeColors = {
    high_school: '#6366f1', // indigo
    junior_high: '#10b981', // green
    elementary: '#f59e0b', // amber
};

// 自定義圖標
function createColoredIcon(color: string, selected = false) {
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="
            background-color: ${color};
            width: ${selected ? 24 : 18}px;
            height: ${selected ? 24 : 18}px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 0 0 ${selected ? 3 : 0}px ${selected ? '#312e81' : 'transparent'}, 0 2px 4px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: selected ? [24, 24] : [18, 18],
        iconAnchor: selected ? [12, 12] : [9, 9],
    });
}

// 地圖中心調整組件
function MapBounds({ schools }: { schools: { name: string; coords: [number, number] }[] }) {
    const map = useMap();

    useEffect(() => {
        if (schools.length > 0) {
            const bounds = L.latLngBounds(schools.map(s => s.coords));
            map.fitBounds(bounds, { padding: [30, 30] });
        }
    }, [schools, map]);

    return null;
}

interface SchoolMapProps {
    courses: Course[];
    height?: string;
}

interface SchoolMapEntry {
    name: string;
    coords?: [number, number];
    count: number;
    type: 'high_school' | 'junior_high' | 'elementary';
    color: string;
}

type MappedSchool = SchoolMapEntry & { coords: [number, number] };

function hasCoordinates(school: SchoolMapEntry): school is MappedSchool {
    return Boolean(school.coords);
}

function normalizeSchoolSearchText(value: string) {
    return value
        .toLocaleLowerCase('zh-TW')
        .replace(/國民中小學/g, '國中小')
        .replace(/國民小學/g, '國小')
        .replace(/國民中學/g, '國中')
        .replace(/高級中學/g, '高中')
        .replace(/\s+/g, '');
}

export default function SchoolMap({ courses, height = '300px' }: SchoolMapProps) {
    const { selectedSchool, setSelectedSchool } = useCourseStore();
    const [schoolQuery, setSchoolQuery] = useState('');

    const allSchoolData = useMemo(() => {
        const schoolMap = new Map<string, { count: number; type: 'high_school' | 'junior_high' | 'elementary' }>();

        courses.forEach((course) => {
            const name = course.schoolName;
            if (!name) return;
            if (!schoolMap.has(name)) {
                schoolMap.set(name, { count: 1, type: getSchoolType(name) });
            } else {
                schoolMap.get(name)!.count++;
            }
        });

        return Array.from(schoolMap.entries())
            .map(([name, data]) => ({
                name,
                coords: SCHOOL_COORDINATES[name],
                count: data.count,
                type: data.type,
                color: schoolTypeColors[data.type],
            }))
            .sort((a, b) => a.name.localeCompare(b.name, 'zh-TW')) as SchoolMapEntry[];
    }, [courses]);

    const mappedSchools = useMemo(
        () => allSchoolData.filter(hasCoordinates),
        [allSchoolData],
    );
    const unmappedCount = allSchoolData.length - mappedSchools.length;
    const filteredSchools = useMemo(() => {
        const query = normalizeSchoolSearchText(schoolQuery.trim());
        if (!query) return allSchoolData;
        return allSchoolData.filter((school) => normalizeSchoolSearchText(school.name).includes(query));
    }, [allSchoolData, schoolQuery]);

    const toggleSchool = (schoolName: string) => {
        setSelectedSchool(selectedSchool === schoolName ? null : schoolName);
    };

    // 新北市中心座標
    const center: [number, number] = [25.0169, 121.4628];

    return (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <MapContainer
                center={center}
                zoom={11}
                style={{ height, width: '100%' }}
                scrollWheelZoom={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapBounds schools={mappedSchools} />

                {mappedSchools.map((school) => (
                    <Marker
                        key={school.name}
                        position={school.coords}
                        icon={createColoredIcon(school.color, selectedSchool === school.name)}
                        title={`${school.name}，${school.count} 門課程`}
                        alt={`${school.name}，${school.count} 門課程`}
                        keyboard
                        eventHandlers={{
                            click: () => toggleSchool(school.name),
                        }}
                    >
                        <Popup>
                            <div className="text-sm">
                                <p className="font-semibold">{school.name}</p>
                                <p className="text-gray-600">{school.count} 門課程</p>
                                {selectedSchool === school.name && (
                                    <button
                                        type="button"
                                        onClick={() => setSelectedSchool(null)}
                                        className="mt-1 min-h-11 text-indigo-600 hover:underline"
                                    >
                                        顯示全部
                                    </button>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
                <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: schoolTypeColors.high_school }} />
                    高中職
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: schoolTypeColors.junior_high }} />
                    國中／國中小
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: schoolTypeColors.elementary }} />
                    國小
                </span>
                {selectedSchool && (
                    <button
                        type="button"
                        onClick={() => setSelectedSchool(null)}
                        className="ml-auto inline-flex min-h-9 items-center gap-1 rounded-md bg-indigo-50 px-2.5 font-medium text-indigo-700 hover:bg-indigo-100"
                    >
                        <X className="h-3.5 w-3.5" />
                        清除學校篩選
                    </button>
                )}
            </div>

            <section className="border-t border-slate-200 px-4 py-4" aria-labelledby="school-list-title">
                <div>
                    <div>
                        <h3 id="school-list-title" className="text-sm font-semibold text-slate-900">學校清單</h3>
                        <p className="mt-0.5 text-xs text-slate-500">
                            共 {allSchoolData.length} 所，{mappedSchools.length} 所已定位
                            {unmappedCount > 0 && `，${unmappedCount} 所待補`}
                        </p>
                    </div>
                </div>

                <label className="relative mt-3 block" htmlFor="school-list-search">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        id="school-list-search"
                        type="search"
                        aria-label="搜尋學校"
                        value={schoolQuery}
                        onChange={(event) => setSchoolQuery(event.target.value)}
                        placeholder="搜尋學校"
                        className="min-h-11 w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                    />
                </label>

                <div className="mt-3 max-h-56 overflow-y-auto pr-1">
                    {filteredSchools.length > 0 ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                            {filteredSchools.map((school) => (
                                <button
                                    key={school.name}
                                    type="button"
                                    aria-pressed={selectedSchool === school.name}
                                    onClick={() => toggleSchool(school.name)}
                                    className={`flex min-h-11 items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-xs transition-colors ${selectedSchool === school.name
                                        ? 'border-indigo-300 bg-indigo-50 font-medium text-indigo-800'
                                        : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-slate-50'
                                    }`}
                                >
                                    <span className="min-w-0 leading-5">{school.name}</span>
                                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 tabular-nums text-slate-600">
                                        {school.count}
                                    </span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p className="rounded-md bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">找不到符合的學校</p>
                    )}
                </div>
            </section>
        </div>
    );
}
