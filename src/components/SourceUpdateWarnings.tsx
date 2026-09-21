import type { CourseSourceStatus } from '../types/course';

export default function SourceUpdateWarnings({ sources }: { sources?: CourseSourceStatus[] }) {
    const warnings = sources?.filter((source) => source.status !== 'updated') ?? [];
    if (warnings.length === 0) return null;

    return (
        <div role="status" className="mt-2 space-y-1 text-sm text-amber-700">
            {warnings.map((source) => (
                <p key={source.type}>
                    {source.name}：{source.status === 'partial'
                        ? '部分活動或詳情暫時無法取得，請以官方公告為準。'
                        : source.status === 'cached' && source.lastUpdated
                            ? `暫時無法更新，保留 ${new Date(source.lastUpdated).toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' })} 最後成功取得的資料（${source.courseCount} 門課程）。`
                            : '暫時無法取得資料，本次未包含此來源的課程。'}
                </p>
            ))}
        </div>
    );
}
