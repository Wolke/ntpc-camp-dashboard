import type { Course } from '../types/course';

const TASKS_SCOPE = 'https://www.googleapis.com/auth/tasks';
const TASKS_API_BASE = 'https://tasks.googleapis.com/tasks/v1';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

type TokenResponse = {
    access_token?: string;
    error?: string;
};

type TokenClient = {
    requestAccessToken: (options?: { prompt?: string }) => void;
    callback: (response: TokenResponse) => void;
};

declare global {
    interface Window {
        google?: {
            accounts?: {
                oauth2?: {
                    initTokenClient: (config: {
                        client_id: string;
                        scope: string;
                        callback: (response: TokenResponse) => void;
                    }) => TokenClient;
                };
            };
        };
    }
}

let tokenClient: TokenClient | null = null;
let accessToken: string | null = null;
let loadingScript: Promise<void> | null = null;

function loadGoogleIdentityScript(): Promise<void> {
    if (window.google?.accounts?.oauth2) return Promise.resolve();
    if (loadingScript) return loadingScript;

    loadingScript = new Promise((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
        if (existing) {
            existing.addEventListener('load', () => resolve(), { once: true });
            existing.addEventListener('error', () => reject(new Error('Google Identity Services 載入失敗')), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Google Identity Services 載入失敗'));
        document.head.appendChild(script);
    });

    return loadingScript;
}

async function getAccessToken(): Promise<string> {
    if (accessToken) return accessToken;
    if (!GOOGLE_CLIENT_ID) {
        throw new Error('尚未設定 VITE_GOOGLE_CLIENT_ID，無法直接寫入 Google Tasks');
    }

    await loadGoogleIdentityScript();

    return new Promise((resolve, reject) => {
        const oauth2 = window.google?.accounts?.oauth2;
        if (!oauth2) {
            reject(new Error('Google Identity Services 尚未就緒'));
            return;
        }

        tokenClient = oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: TASKS_SCOPE,
            callback: (response) => {
                if (response.error || !response.access_token) {
                    reject(new Error(response.error || 'Google 授權失敗'));
                    return;
                }
                accessToken = response.access_token;
                resolve(response.access_token);
            },
        });

        tokenClient.requestAccessToken({ prompt: 'consent' });
    });
}

function getReminderDue(course: Course): string | null {
    const now = new Date();
    const registrationStart = course.registration?.startTime ? new Date(course.registration.startTime) : null;
    const registrationEnd = course.registration?.endTime ? new Date(course.registration.endTime) : null;
    const dueDate = registrationStart && registrationStart > now ? registrationStart : registrationEnd;

    if (!dueDate || Number.isNaN(dueDate.getTime())) return null;
    return dueDate.toISOString();
}

export function buildRegistrationTask(course: Course) {
    const registrationStart = course.registration?.startTime
        ? new Date(course.registration.startTime).toLocaleString('zh-TW', { dateStyle: 'medium', timeStyle: 'short' })
        : '未提供';
    const registrationEnd = course.registration?.endTime
        ? new Date(course.registration.endTime).toLocaleString('zh-TW', { dateStyle: 'medium', timeStyle: 'short' })
        : '未提供';

    return {
        title: `報名：${course.category || course.courseName}`,
        notes: [
            `學校/單位：${course.schoolName}`,
            course.campName ? `營隊：${course.campName}` : '',
            course.courseName ? `類別：${course.courseName}` : '',
            `課程日期：${course.schedule.startDate} - ${course.schedule.endDate}`,
            `報名期間：${registrationStart} - ${registrationEnd}`,
            `費用：${course.fee.description || (course.fee.isFree ? '免費' : '未提供')}`,
            course.urls?.registration ? `報名入口：${course.urls.registration}` : '',
            course.urls?.prospectus ? `活動簡章：${course.urls.prospectus}` : '',
        ].filter(Boolean).join('\n'),
        due: getReminderDue(course),
    };
}

export async function createGoogleTask(course: Course) {
    const token = await getAccessToken();
    const task = buildRegistrationTask(course);

    const taskListsResponse = await fetch(`${TASKS_API_BASE}/users/@me/lists`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!taskListsResponse.ok) {
        throw new Error('無法取得 Google Tasks 清單');
    }

    const taskLists = await taskListsResponse.json() as { items?: Array<{ id: string; title: string }> };
    const defaultTaskList = taskLists.items?.[0];

    if (!defaultTaskList) {
        throw new Error('找不到可寫入的 Google Tasks 清單');
    }

    const insertResponse = await fetch(`${TASKS_API_BASE}/lists/${encodeURIComponent(defaultTaskList.id)}/tasks`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(task),
    });

    if (!insertResponse.ok) {
        throw new Error('新增 Google Task 失敗');
    }

    return insertResponse.json() as Promise<{ id: string; webViewLink?: string }>;
}

export async function copyTaskFallback(course: Course) {
    const task = buildRegistrationTask(course);
    await navigator.clipboard.writeText(`${task.title}\n\n${task.notes}`);
    window.open('https://calendar.google.com/calendar/u/0/r/tasks', '_blank', 'noopener,noreferrer');
}

export function isGoogleTasksConfigured() {
    return Boolean(GOOGLE_CLIENT_ID);
}
