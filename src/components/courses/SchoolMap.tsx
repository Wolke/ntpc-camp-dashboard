import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Search } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import type { Course } from '../../types/course';
import { useCourseStore } from '../../store/courseStore';
import { getCourseDistrict, getSchoolType, UNKNOWN_DISTRICT } from '../../utils/courseFilters';
import { SCHOOL_COORDINATES } from '../../utils/schoolCoordinates';

type LeafletDefaultIconPrototype = L.Icon.Default & { _getIconUrl?: unknown };
delete (L.Icon.Default.prototype as LeafletDefaultIconPrototype)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const schoolTypeColors = { high_school: '#6366f1', junior_high: '#10b981', elementary: '#f59e0b' };

function createColoredIcon(color: string, selected = false) {
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color:${color};width:${selected ? 24 : 18}px;height:${selected ? 24 : 18}px;border-radius:50%;border:2px solid white;box-shadow:0 0 0 ${selected ? 3 : 0}px ${selected ? '#312e81' : 'transparent'},0 2px 4px rgba(0,0,0,.3)"></div>`,
        iconSize: selected ? [24, 24] : [18, 18],
        iconAnchor: selected ? [12, 12] : [9, 9],
    });
}

interface SchoolEntry {
    name: string;
    district: string;
    coords?: [number, number];
    count: number;
    type: 'high_school' | 'junior_high' | 'elementary';
    color: string;
}

type MappedSchool = SchoolEntry & { coords: [number, number] };

function hasCoordinates(school: SchoolEntry): school is MappedSchool {
    return Boolean(school.coords);
}

function MapBounds({ schools }: { schools: MappedSchool[] }) {
    const map = useMap();
    useEffect(() => {
        if (schools.length > 0) {
            map.fitBounds(L.latLngBounds(schools.map((school) => school.coords)), { padding: [30, 30] });
        }
    }, [map, schools]);
    return null;
}

function normalizeSchoolSearchText(value: string) {
    return value.toLocaleLowerCase('zh-TW')
        .replace(/國民中小學/g, '國中小')
        .replace(/國民小學/g, '國小')
        .replace(/國民中學/g, '國中')
        .replace(/高級中學/g, '高中')
        .replace(/\s+/g, '');
}

function districtLabel(district: string) {
    if (district === UNKNOWN_DISTRICT) return '未標示行政區';
    return district.replace(/^新北市|^臺北市/, '');
}

interface SchoolMapProps {
    courses: Course[];
    onSchoolSelected?: () => void;
}

export default function SchoolMap({ courses, onSchoolSelected }: SchoolMapProps) {
    const { filters, setFilters } = useCourseStore();
    const [schoolQuery, setSchoolQuery] = useState('');

    const allSchoolData = useMemo(() => {
        const schools = new Map<string, { count: number; sample: Course }>();
        courses.forEach((course) => {
            if (!course.schoolName) return;
            const current = schools.get(course.schoolName);
            if (current) current.count += 1;
            else schools.set(course.schoolName, { count: 1, sample: course });
        });
        return Array.from(schools.entries()).map(([name, data]) => {
            const type = getSchoolType(name);
            return {
                name,
                district: getCourseDistrict(data.sample),
                coords: SCHOOL_COORDINATES[name],
                count: data.count,
                type,
                color: schoolTypeColors[type],
            } satisfies SchoolEntry;
        }).sort((a, b) => a.name.localeCompare(b.name, 'zh-TW'));
    }, [courses]);

    const districtData = useMemo(() => {
        const values = new Map<string, { schools: number; courses: number }>();
        allSchoolData.forEach((school) => {
            const current = values.get(school.district) || { schools: 0, courses: 0 };
            current.schools += 1;
            current.courses += school.count;
            values.set(school.district, current);
        });
        return Array.from(values.entries()).sort(([a], [b]) => {
            if (a === UNKNOWN_DISTRICT) return 1;
            if (b === UNKNOWN_DISTRICT) return -1;
            return a.localeCompare(b, 'zh-TW');
        });
    }, [allSchoolData]);

    const visibleSchools = useMemo(() => {
        const query = normalizeSchoolSearchText(schoolQuery.trim());
        return allSchoolData.filter((school) => {
            if (filters.district && school.district !== filters.district) return false;
            return !query || normalizeSchoolSearchText(school.name).includes(query);
        });
    }, [allSchoolData, filters.district, schoolQuery]);
    const mappedSchools = useMemo(() => visibleSchools.filter(hasCoordinates), [visibleSchools]);

    const selectDistrict = (district: string | null) => {
        setFilters({ district, schoolName: null });
    };

    const toggleSchool = (schoolName: string) => {
        const nextSchool = filters.schoolName === schoolName ? null : schoolName;
        setFilters({ schoolName: nextSchool });
        if (nextSchool) onSchoolSelected?.();
    };

    return (
        <section aria-labelledby="school-finder-title" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-5 w-5 text-indigo-600" />
                <div>
                    <h3 id="school-finder-title" className="font-semibold text-slate-900">依行政區或學校尋找</h3>
                    <p className="mt-1 text-xs text-slate-500">先縮小行政區，再從清單或地圖選擇學校。</p>
                </div>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:flex-wrap">
                <button type="button" onClick={() => selectDistrict(null)} aria-pressed={!filters.district} className={`min-h-11 shrink-0 rounded-md border px-3 text-sm font-medium ${!filters.district ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    全部地區
                </button>
                {districtData.map(([district, counts]) => (
                    <button key={district} type="button" onClick={() => selectDistrict(district)} aria-pressed={filters.district === district} className={`min-h-11 shrink-0 rounded-md border px-3 text-left text-sm ${filters.district === district ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        <span className="font-medium">{districtLabel(district)}</span><span className="ml-1 text-xs opacity-75">{counts.schools} 校／{counts.courses} 課</span>
                    </button>
                ))}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.2fr)]">
                <div>
                    <label className="relative block" htmlFor="school-list-search">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input id="school-list-search" type="search" aria-label="搜尋學校" value={schoolQuery} onChange={(event) => setSchoolQuery(event.target.value)} placeholder="搜尋學校" className="min-h-11 w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100" />
                    </label>
                    <p className="mt-2 text-xs text-slate-500">找到 {visibleSchools.length} 所學校</p>
                    <div role="region" aria-label="學校清單" className="mt-2 max-h-72 space-y-2 overflow-y-auto pr-1">
                        {visibleSchools.map((school) => (
                            <button key={school.name} type="button" aria-pressed={filters.schoolName === school.name} onClick={() => toggleSchool(school.name)} className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-xs ${filters.schoolName === school.name ? 'border-indigo-300 bg-indigo-50 font-medium text-indigo-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                                <span className="leading-5">{school.name}</span><span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 tabular-nums">{school.count}</span>
                            </button>
                        ))}
                        {!visibleSchools.length && <p className="rounded-md bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">找不到符合的學校</p>}
                    </div>
                </div>

                <div className="order-first overflow-hidden rounded-md border border-slate-200 lg:order-none">
                    <MapContainer center={[25.0169, 121.4628]} zoom={11} style={{ height: '320px', width: '100%' }} scrollWheelZoom={false}>
                        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <MapBounds schools={mappedSchools} />
                        {mappedSchools.map((school) => (
                            <Marker key={school.name} position={school.coords} icon={createColoredIcon(school.color, filters.schoolName === school.name)} title={`${school.name}，${school.count} 門課程`} alt={`${school.name}，${school.count} 門課程`} keyboard eventHandlers={{ click: () => toggleSchool(school.name) }}>
                                <Popup><p className="font-semibold">{school.name}</p><p>{school.count} 門課程</p></Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>
            </div>
        </section>
    );
}
