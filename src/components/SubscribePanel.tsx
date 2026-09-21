import { Bell, Check, Mail, Send, XCircle } from 'lucide-react';
import { FormEvent, useState } from 'react';
import type { Course, FilterOptions } from '../types/course';
import { getCourseDisplayTitle } from '../utils/courseTaxonomy';
import {
    describeNotificationFilters,
    FREQUENCY_LABELS,
    normalizeNotificationPreferences,
    type NotificationFrequency,
    type NotificationPreferences,
} from '../utils/notificationPreferences';

type SubscribeStatus = 'idle' | 'submitting' | 'success' | 'fallback' | 'error';

function isGoogleAppsScriptEndpoint(endpoint: string) {
    return new URL(endpoint).hostname === 'script.google.com';
}

function buildMailto(contact: string, email: string, preferences: NotificationPreferences) {
    const subject = encodeURIComponent('訂閱／更新育樂營 email 通知');
    const body = encodeURIComponent([
        '請幫我訂閱或更新育樂營通知：',
        `Email：${email}`,
        `通知頻率：${FREQUENCY_LABELS[preferences.frequency]}`,
        `篩選條件：${describeNotificationFilters(preferences.filters).join('；')}`,
        '',
        `訂閱設定：${JSON.stringify(preferences)}`,
    ].join('\n'));
    return `mailto:${contact}?subject=${subject}&body=${body}`;
}

interface SubscribePanelProps {
    filters: FilterOptions;
    courses: Course[];
    isLoading?: boolean;
    hasError?: boolean;
}

export default function SubscribePanel({ filters, courses, isLoading, hasError }: SubscribePanelProps) {
    const [email, setEmail] = useState('');
    const [frequency, setFrequency] = useState<NotificationFrequency>('weekly');
    const [status, setStatus] = useState<SubscribeStatus>('idle');
    const [message, setMessage] = useState('');
    const summary = describeNotificationFilters(filters);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail) return;
        setStatus('submitting');
        setMessage('正在儲存訂閱條件…');

        try {
            const preferences = normalizeNotificationPreferences({ schemaVersion: 1, frequency, filters });
            const endpoint = import.meta.env.VITE_SUBSCRIBE_ENDPOINT;
            const contact = import.meta.env.VITE_SUBSCRIBE_CONTACT_EMAIL;
            if (endpoint) {
                const payload = {
                    email: normalizedEmail,
                    preferences,
                    source: 'ntpc-camp-dashboard',
                    createdAt: new Date().toISOString(),
                };

                if (isGoogleAppsScriptEndpoint(endpoint)) {
                    await fetch(endpoint, {
                        method: 'POST',
                        mode: 'no-cors',
                        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                        body: JSON.stringify(payload),
                    });
                    setStatus('fallback');
                    setMessage('訂閱條件已送出，但瀏覽器無法確認伺服器是否成功儲存。若未收到通知，請聯絡管理者確認。');
                    return;
                }

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                if (!response.ok) throw new Error('subscription_failed');
                const responseData = await response.json() as { ok?: boolean; preferencesSaved?: boolean };
                if (responseData.ok !== true || responseData.preferencesSaved !== true) {
                    throw new Error('preferences_not_confirmed');
                }
                setStatus('success');
                setMessage(`已儲存「${FREQUENCY_LABELS[frequency]}」與本次篩選條件。沒有符合課程時不寄信。`);
                setEmail('');
                return;
            }

            if (contact) {
                window.location.href = buildMailto(contact, normalizedEmail, preferences);
                setStatus('fallback');
                setMessage('已開啟包含通知條件的 email 草稿，送出後由管理者建立或更新訂閱。');
                return;
            }
            setStatus('error');
            setMessage('Email 訂閱尚未開放，請稍後再試。');
        } catch {
            setStatus('error');
            setMessage('無法確認訂閱條件已儲存，請稍後重試或聯絡管理者。');
        }
    };

    const StatusIcon = status === 'success' ? Check : status === 'error' ? XCircle : Bell;
    const disabled = status === 'submitting' || isLoading || hasError;

    return (
        <section id="email-subscription" aria-labelledby="email-subscription-title" className="scroll-mt-20 rounded-lg border border-indigo-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-start gap-3">
                <div className="rounded-md bg-indigo-50 p-2 text-indigo-600"><StatusIcon className="h-5 w-5" /></div>
                <div>
                    <h2 id="email-subscription-title" className="font-semibold text-slate-900">客製化 email 通知</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">每週一名單更新成功後，寄送符合你條件的課程。沒有符合課程時不寄信。</p>
                </div>
            </div>

            <div className="mb-4 rounded-md bg-slate-50 p-3">
                <p className="text-sm font-medium text-slate-800">訂閱目前的查詢條件</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">先用上方篩選調整條件，送出時會保存這組設定。之後瀏覽其他課程不會改變訂閱。</p>
                <ul aria-label="通知篩選條件" className="mt-2 flex flex-wrap gap-2">
                    {summary.map((label) => <li key={label} className="max-w-full break-words rounded-md border border-indigo-100 bg-white px-2 py-1 text-xs text-indigo-800">{label}</li>)}
                </ul>
                <p className="mt-2 text-xs text-slate-600">{isLoading ? '正在確認符合課程…' : hasError ? '請先重新載入課程資料。' : `目前符合 ${courses.length} 門課程；寄送時會依最新名單重新篩選。`}</p>
                {!isLoading && !hasError && courses.length > 0 && (
                    <details className="mt-2 text-xs text-slate-700">
                        <summary className="min-h-9 cursor-pointer py-2 font-medium text-indigo-700">預覽符合課程</summary>
                        <ul className="space-y-2 pb-1">
                            {courses.slice(0, 3).map((course, index) => <li key={index}>{getCourseDisplayTitle(course)} · {course.schoolName}</li>)}
                            {courses.length > 3 && <li>其餘 {courses.length - 3} 門也會依條件納入通知。</li>}
                        </ul>
                    </details>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
                <fieldset disabled={status === 'submitting'} className="grid min-w-0 gap-3 sm:grid-cols-2">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="subscribe-frequency">通知頻率</label>
                        <select id="subscribe-frequency" value={frequency} onChange={(event) => setFrequency(event.target.value as NotificationFrequency)} className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
                            {Object.entries(FREQUENCY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="subscribe-email">Email</label>
                        <div className="relative">
                            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input id="subscribe-email" type="email" required maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="輸入 email" className="min-h-11 w-full rounded-md border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                        </div>
                    </div>
                </fieldset>
                {frequency !== 'weekly' && <p className="text-xs leading-5 text-slate-600">每日提醒只列出當天開放報名、且符合這組條件的課程。</p>}
                <button type="submit" disabled={disabled} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-wait disabled:bg-indigo-400">
                    <Send className="h-4 w-4" />{status === 'submitting' ? '送出中' : '訂閱／更新通知'}
                </button>
                <p className="text-xs leading-5 text-slate-500">同一 email 再次送出會更新通知頻率與條件。若要停止通知，請聯絡寄件者。</p>
                {message && <p aria-live="polite" className={`text-sm leading-6 ${status === 'error' ? 'text-red-700' : 'text-slate-700'}`}>{message}</p>}
            </form>
        </section>
    );
}
