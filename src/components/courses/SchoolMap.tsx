import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Course } from '../../types/course';
import { useCourseStore, getSchoolType } from '../../store/courseStore';

// 修復 Leaflet 預設圖標問題
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// 學校座標（根據地址預設）
const SCHOOL_COORDINATES: Record<string, [number, number]> = {
    // 高中職
    '新北市私立東海高中': [25.0653, 121.4892],
    '新北市私立格致高級中學': [25.0658, 121.4875],
    '新北市私立莊敬高級工業家事職業學校': [24.9678, 121.5378],
    '新北市立泰山高級中學': [25.0589, 121.4312],
    '新北市立三重高級商工職業學校': [25.0712, 121.4856],
    '新北市立新北高級工業職業學校': [24.9723, 121.4512],
    '新北市立三重高級中學': [25.0634, 121.4923],
    '新北市立永平高級中學': [25.0078, 121.5156],
    '新北市立鶯歌高級工商職業學校': [24.9523, 121.3534],
    // 國中
    '新北市立板橋國民中學': [25.0145, 121.4623],
    '新北市立新泰國民中學': [25.0456, 121.4378],
    '新北市立福和國民中學': [25.0089, 121.5178],
    '新北市立中正國民中學': [24.9712, 121.4489],
    '新北市立三多國民中學': [25.0723, 121.4867],
    '新北市立桃子腳國民中小學': [24.9867, 121.4123],
    // 國小
    '新北市板橋區埔墘國民小學': [25.0134, 121.4567],
    '新北市板橋區海山國民小學': [25.0156, 121.4589],
    '新北市樹林區大同國民小學': [24.9834, 121.4189],
    '新北市樹林區武林國民小學': [24.9789, 121.4167],
    '新北市樹林區柑園國民小學': [24.9712, 121.4234],
    '新北市中和區秀山國民小學': [24.9923, 121.4989],
    '新北市土城區土城國民小學': [24.9678, 121.4434],
    '新北市土城區頂埔國民小學': [24.9589, 121.4378],
    '新北市新店區雙城國民小學': [24.9734, 121.5234],
    '新北市淡水區天生國民小學': [25.1689, 121.4412],
    '新北市新莊區新莊國民小學': [25.0378, 121.4534],
    '新北市新莊區中港國民小學': [25.0412, 121.4589],
    '新北市泰山區泰山國民小學': [25.0534, 121.4267],
    '新北市五股區成州國民小學': [25.0734, 121.4123],
    '新北市五股區五股國民小學': [25.0789, 121.4234],
    '新北市林口區南勢國民小學': [25.0912, 121.3923],
    '新北市三重區永福國民小學': [25.0634, 121.4856],
    '新北市三重區修德國民小學': [25.0589, 121.4934],
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
        </div>
    );
}
