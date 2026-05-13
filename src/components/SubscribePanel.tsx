import { Bell, Check, Mail, Send, XCircle } from 'lucide-react';
import { FormEvent, useState } from 'react';

const SUBSCRIBE_ENDPOINT = import.meta.env.VITE_SUBSCRIBE_ENDPOINT as string | undefined;
const SUBSCRIBE_CONTACT_EMAIL = import.meta.env.VITE_SUBSCRIBE_CONTACT_EMAIL as string | undefined;

type SubscribeStatus = 'idle' | 'submitting' | 'success' | 'fallback' | 'error';

function isGoogleAppsScriptEndpoint(endpoint: string) {
    return endpoint.includes('script.google.com');
}

function buildMailto(email: string) {
    if (!SUBSCRIBE_CONTACT_EMAIL) return null;
    const subject = encodeURIComponent('訂閱新北育樂營報名通知');
    const body = encodeURIComponent(`請幫我訂閱新北育樂營報名通知：\n\nEmail：${email}`);
    return `mailto:${SUBSCRIBE_CONTACT_EMAIL}?subject=${subject}&body=${body}`;
}

export default function SubscribePanel() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<SubscribeStatus>('idle');
    const [message, setMessage] = useState('每天早上通知今天開放報名的活動。');

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const normalizedEmail = email.trim();
        if (!normalizedEmail) return;

        setStatus('submitting');

        try {
            if (SUBSCRIBE_ENDPOINT) {
                const payload = {
                    email: normalizedEmail,
                    source: 'ntpc-camp-dashboard',
                    createdAt: new Date().toISOString(),
                    userAgent: window.navigator.userAgent,
                };

                if (isGoogleAppsScriptEndpoint(SUBSCRIBE_ENDPOINT)) {
                    await fetch(SUBSCRIBE_ENDPOINT, {
                        method: 'POST',
                        mode: 'no-cors',
                        headers: {
                            'Content-Type': 'text/plain;charset=utf-8',
                        },
                        body: JSON.stringify(payload),
                    });

                    setStatus('success');
                    setMessage('已送出訂閱申請。');
                    setEmail('');
                    return;
                }

                const response = await fetch(SUBSCRIBE_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    throw new Error('訂閱 API 回應失敗');
                }

                setStatus('success');
                setMessage('已送出訂閱申請。');
                setEmail('');
                return;
            }

            const mailto = buildMailto(normalizedEmail);
            if (mailto) {
                window.location.href = mailto;
                setStatus('fallback');
                setMessage('已開啟 email 草稿，送出後即可請管理者加入訂閱名單。');
                return;
            }

            throw new Error('尚未設定訂閱 endpoint 或聯絡信箱');
        } catch (error) {
            console.error(error);
            setStatus('error');
            setMessage('訂閱功能尚未設定完成，請稍後再試。');
        }
    };

    const StatusIcon = status === 'success'
        ? Check
        : status === 'error'
            ? XCircle
            : Bell;

    return (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-start gap-2">
                <div className="rounded-md bg-indigo-50 p-2 text-indigo-600">
                    <StatusIcon className="h-4 w-4" />
                </div>
                <div>
                    <h2 className="text-sm font-semibold text-slate-900">報名開放通知</h2>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{message}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-2">
                <label className="sr-only" htmlFor="subscribe-email">Email</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        id="subscribe-email"
                        type="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="輸入 email"
                        className="w-full rounded-md border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                </div>
                <button
                    type="submit"
                    disabled={status === 'submitting'}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-wait disabled:bg-indigo-400"
                >
                    <Send className="h-4 w-4" />
                    {status === 'submitting' ? '送出中' : '訂閱通知'}
                </button>
            </form>
        </section>
    );
}
