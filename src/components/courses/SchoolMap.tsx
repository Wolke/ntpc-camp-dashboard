import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Course } from '../../types/course';
import { useCourseStore, getSchoolType } from '../../store/courseStore';

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

// 學校座標。新北優先採用「新北市學校通訊資料」WGS84；台北以教育局學校地址資料搭配 OSM/Nominatim 補點。
const SCHOOL_COORDINATES: Record<string, [number, number]> = {
    // 國中
    '新北市立五峰國民中學': [24.966374, 121.543996],
    '新北市立清水高級中學': [24.982013, 121.465311],
    '新北市立碧華國民中學': [25.081479, 121.493938],
    '新北市立福和國民中學': [25.003998, 121.520855],
    // 國小
    '新北市三重區正義國民小學': [25.064443, 121.496115],
    '新北市三重區光榮國民小學': [25.070927, 121.501317],
    '新北市三重區厚德國民小學': [25.071822, 121.488730],
    '新北市三重區修德國民小學': [25.066232, 121.488903],
    '新北市土城區樂利國民小學': [24.985601, 121.447559],
    '新北市中和區光復國民小學': [25.014698, 121.482576],
    '新北市五股區五股國民小學': [25.082250, 121.437118],
    '新北市汐止區金龍國民小學': [25.068719, 121.627218],
    '新北市板橋區埔墘國民小學': [25.0134, 121.4567],
    '新北市板橋區海山國民小學': [25.009551, 121.470903],
    '新北市林口區麗林國民小學': [25.068714, 121.367903],
    '新北市貢寮區福連國民小學': [25.016814, 121.988471],
    '新北市新店區中正國民小學': [24.971737, 121.536638],
    '新北市新莊區中港國民小學': [25.045069, 121.447166],
    '新北市新莊區民安國民小學': [25.021632, 121.427798],
    '新北市新莊區昌隆國民小學': [25.051403, 121.455404],
    '新北市新莊區新莊國民小學': [25.036967, 121.456423],
    '新北市新莊區豐年國民小學': [25.030931, 121.443331],
    '新北市瑞芳區瑞芳國民小學': [25.108048, 121.804422],
    '新北市樹林區彭福國民小學': [24.981930, 121.423440],
    '新北市樹林區樹林國民小學': [24.989426, 121.417829],
    '新北市蘆洲區成功國民小學': [25.085672, 121.457458],
    '新北市蘆洲區蘆洲國民小學': [25.084276, 121.469947],
    '新北市蘆洲區鷺江國民小學': [25.084356, 121.476137],
    '新北市鶯歌區昌福國民小學': [24.955643, 121.339161],
    // 台北市國小
    '臺北市三興國小': [25.0291701, 121.5587105],
    '臺北市北投國小': [25.1339783, 121.4996200],
    '臺北市南湖國小': [25.0679289, 121.6109018],
    '臺北市博嘉實小': [25.0018750, 121.5754864],
    '臺北市忠孝國小': [25.0429427, 121.5317807],
    '臺北市木柵國小': [24.9907081, 121.5696450],
    '臺北市東園國小': [25.0231730, 121.4984515],
    '臺北市東門國小': [25.0383307, 121.5204463],
    '臺北市永樂國小': [25.0610200, 121.5105393],
    '臺北市長安國小': [25.0494981, 121.5307076],
    '臺北市關渡國小': [25.1263525, 121.4665758],
    '臺北市陽明山國小': [25.1195715, 121.5525467],
    '臺北市雙溪國小': [25.1065502, 121.5646786],
    '臺北市雙蓮國小': [25.0606057, 121.5168133],
};

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
                scrollWheelZoom={true}
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
