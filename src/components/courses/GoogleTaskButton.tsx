import { Check, ClipboardCopy, Loader2 } from 'lucide-react';
import type { MouseEvent } from 'react';
import { useState } from 'react';
import type { Course } from '../../types/course';
import { copyTaskFallback, createGoogleTask, isGoogleTasksConfigured } from '../../utils/googleTasks';

interface GoogleTaskButtonProps {
    course: Course;
}

type TaskStatus = 'idle' | 'saving' | 'done' | 'copied' | 'error';

export default function GoogleTaskButton({ course }: GoogleTaskButtonProps) {
    const [status, setStatus] = useState<TaskStatus>('idle');

    const handleClick = async (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        setStatus('saving');

        try {
            if (isGoogleTasksConfigured()) {
                await createGoogleTask(course);
                setStatus('done');
            } else {
                await copyTaskFallback(course);
                setStatus('copied');
            }
        } catch (error) {
            console.error(error);
            setStatus('error');
        }

        window.setTimeout(() => setStatus('idle'), 3200);
    };

    const label = {
        idle: '新增報名通知',
        saving: '處理中',
        done: '已新增',
        copied: '已複製',
        error: '新增失敗',
    }[status];

    const Icon = status === 'saving'
        ? Loader2
        : status === 'done'
            ? Check
            : ClipboardCopy;

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={status === 'saving'}
            title={isGoogleTasksConfigured() ? '新增到 Google Tasks' : '尚未設定 Google OAuth，會複製待辦內容並開啟 Google Tasks'}
            className={`inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-wait ${status === 'done'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : status === 'error'
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700'
                }`}
        >
            <Icon className={`h-4 w-4 ${status === 'saving' ? 'animate-spin' : ''}`} />
            {label}
        </button>
    );
}
