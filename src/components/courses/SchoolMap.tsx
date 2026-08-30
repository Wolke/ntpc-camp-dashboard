import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
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
function createColoredIcon(color: string) {
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="
      background-color: ${color};
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
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

export default function SchoolMap({ courses, height = '300px' }: SchoolMapProps) {
    const { selectedSchool, setSelectedSchool } = useCourseStore();

    // 計算每個學校的課程數量
    const schoolData = useMemo(() => {
        const schoolMap = new Map<string, { count: number; type: 'high_school' | 'junior_high' | 'elementary' }>();

        courses.forEach((course) => {
            const name = course.schoolName;
            if (!schoolMap.has(name)) {
                schoolMap.set(name, { count: 1, type: getSchoolType(name) });
            } else {
                schoolMap.get(name)!.count++;
            }
        });

        return Array.from(schoolMap.entries())
            .filter(([name]) => SCHOOL_COORDINATES[name])
            .map(([name, data]) => ({
                name,
                coords: SCHOOL_COORDINATES[name],
                count: data.count,
                type: data.type,
                color: schoolTypeColors[data.type],
            }));
    }, [courses]);

    const unmappedSchools = useMemo(() => {
        const schoolMap = new Map<string, number>();

        courses.forEach((course) => {
            const name = course.schoolName;
            if (!SCHOOL_COORDINATES[name]) {
                schoolMap.set(name, (schoolMap.get(name) || 0) + 1);
            }
        });

        return Array.from(schoolMap.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-TW'));
    }, [courses]);

    // 新北市中心座標
    const center: [number, number] = [25.0169, 121.4628];

    return (
        <div className="rounded-xl overflow-hidden shadow-sm border border-gray-100">
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
                <MapBounds schools={schoolData} />

                {schoolData.map((school) => (
                    <Marker
                        key={school.name}
                        position={school.coords}
                        icon={createColoredIcon(school.color)}
                        eventHandlers={{
                            click: () => {
                                if (selectedSchool === school.name) {
                                    setSelectedSchool(null);
                                } else {
                                    setSelectedSchool(school.name);
                                }
                            },
                        }}
                    >
                        <Popup>
                            <div className="text-sm">
                                <p className="font-semibold">{school.name}</p>
                                <p className="text-gray-600">{school.count} 門課程</p>
                                {selectedSchool === school.name && (
                                    <button
                                        onClick={() => setSelectedSchool(null)}
                                        className="mt-1 text-indigo-600 hover:underline"
                                    >
                                        顯示全部
                                    </button>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* 圖例 */}
            <div className="bg-white px-3 py-2 flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: schoolTypeColors.high_school }}></span>
                    高中職
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: schoolTypeColors.junior_high }}></span>
                    國中
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: schoolTypeColors.elementary }}></span>
                    國小
                </span>
                {selectedSchool && (
                    <span className="ml-auto text-indigo-600">
                        已選：{selectedSchool}
                    </span>
                )}
            </div>

            {unmappedSchools.length > 0 && (
                <div className="bg-white border-t border-gray-100 px-3 py-3">
                    <p className="text-xs font-medium text-gray-500 mb-2">
                        尚未定位的學校/單位也有課程，可直接點選篩選
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {unmappedSchools.map((school) => (
                            <button
                                key={school.name}
                                onClick={() => {
                                    if (selectedSchool === school.name) {
                                        setSelectedSchool(null);
                                    } else {
                                        setSelectedSchool(school.name);
                                    }
                                }}
                                className={`px-2 py-1 text-xs rounded-full border transition-colors ${selectedSchool === school.name
                                    ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                {school.name} ({school.count})
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
