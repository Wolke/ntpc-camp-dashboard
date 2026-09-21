#!/usr/bin/env -S node --import tsx

import { readFileSync, existsSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHmac } from 'node:crypto';
import process from 'node:process';
import nodemailer from 'nodemailer';
import { applyCourseFilters, sortCourses } from '../src/utils/courseFilters.ts';
import { getCourseDisplayTitle } from '../src/utils/courseTaxonomy.ts';
import { getCourseOfficialUrl } from '../src/utils/courseUtils.ts';
import { describeNotificationFilters, normalizeNotificationPreferences } from '../src/utils/notificationPreferences.ts';

const TIME_ZONE = 'Asia/Taipei';
const SITE_URL = 'https://wolke.github.io/ntpc-camp-dashboard/';

export function taipeiDateKey(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
}

function targetDate(dateKey) {
    const date = new Date(`${dateKey}T08:00:00+08:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !Number.isFinite(date.getTime()) || taipeiDateKey(date) !== dateKey) {
        throw new Error('Invalid TARGET_DATE; expected YYYY-MM-DD.');
    }
    return date;
}

function readJson(filePath) {
    return JSON.parse(readFileSync(filePath, 'utf8'));
}

export function normalizeSubscribers(input) {
    const items = Array.isArray(input) ? input : input?.subscribers;
    if (!Array.isArray(items)) throw new Error('Invalid subscriber list.');
    const subscribers = new Map();
    for (const item of items) {
        const row = typeof item === 'string' ? { email: item } : item;
        const email = typeof row?.email === 'string' ? row.email.trim().toLowerCase() : '';
        if (email.length > 254 || !/^[^\s@<>,;:"\\]+@[^\s@<>,;:"\\]+\.[^\s@<>,;:"\\]+$/.test(email)) continue;
        // The last row wins, including an inactive or invalid replacement.
        subscribers.delete(email);
        if (row.active === false) continue;
        try {
            subscribers.set(email, { email, preferences: normalizeNotificationPreferences(row.preferences) });
        } catch {
            console.warn('Skipped a subscriber with invalid notification preferences.');
        }
    }
    return [...subscribers.values()];
}

export async function loadSubscribers(env = process.env) {
    if (env.SUBSCRIBERS_JSON) return normalizeSubscribers(JSON.parse(env.SUBSCRIBERS_JSON));
    if (env.SUBSCRIBERS_JSON_URL) {
        const response = await fetch(env.SUBSCRIBERS_JSON_URL, { signal: AbortSignal.timeout(30_000) });
        if (!response.ok) throw new Error(`Subscriber API returned HTTP ${response.status}.`);
        const payload = await response.json();
        if (payload.ok === false) throw new Error('Subscriber API did not authorize or complete the request.');
        return normalizeSubscribers(payload);
    }
    const file = env.SUBSCRIBERS_FILE || 'data/subscribers.json';
    return existsSync(file) ? normalizeSubscribers(readJson(file)) : [];
}

export function coursesOpeningOn(courses, dateKey) {
    return courses.filter((course) => {
        const time = new Date(course.registration?.startTime).getTime();
        return Number.isFinite(time) && taipeiDateKey(new Date(time)) === dateKey;
    });
}

export function assertFreshCourseData(data, dateKey) {
    if (!Array.isArray(data.courses)) throw new Error('Invalid course data.');
    const updated = new Date(data.lastUpdated);
    if (!Number.isFinite(updated.getTime()) || taipeiDateKey(updated) !== dateKey) {
        throw new Error('Course data was not updated on the target date. Email delivery stopped.');
    }
}

export function buildDeliveryPlans(courses, subscribers, { dateKey, mode = 'auto', now = targetDate(dateKey) }) {
    if (!['auto', 'weekly', 'daily'].includes(mode)) throw new Error('Invalid NOTIFICATION_MODE.');
    const monday = new Date(`${dateKey}T12:00:00+08:00`).getUTCDay() === 1;
    const modes = mode === 'auto' ? (monday ? ['weekly', 'daily'] : ['daily']) : [mode];
    const plans = [];
    for (const subscriber of subscribers) {
        const matched = applyCourseFilters(courses, subscriber.preferences.filters, now);
        for (const kind of modes) {
            if (![kind, 'both'].includes(subscriber.preferences.frequency)) continue;
            const selected = kind === 'daily' ? coursesOpeningOn(matched, dateKey) : matched;
            if (selected.length) plans.push({
                ...subscriber,
                kind,
                dateKey,
                courses: sortCourses(selected, 'actionable', null, now),
            });
        }
    }
    return plans;
}

function escapeHtml(value) {
    return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function safeUrl(value) {
    try {
        const url = new URL(value);
        return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
    } catch { return null; }
}

function formatTaipeiDateTime(value) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toLocaleString('zh-TW', { timeZone: TIME_ZONE, year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '未提供';
}

export function renderNotification(plan, lastUpdated) {
    const weekly = plan.kind === 'weekly';
    const title = weekly ? '育樂營每週課程摘要' : '育樂營報名開放通知';
    const intro = weekly ? `本週更新後，有 ${plan.courses.length} 門課程符合你的訂閱條件。` : `今天有 ${plan.courses.length} 門符合條件的課程開放報名。`;
    const summary = describeNotificationFilters(plan.preferences.filters).join('；');
    const text = [title, plan.dateKey, intro, `資料更新：${formatTaipeiDateTime(lastUpdated)}`, `訂閱條件：${summary}`, ''];
    const items = plan.courses.map((course, index) => {
        const details = [
            `學校／單位：${course.schoolName}`,
            `課程日期：${course.schedule.startDate}～${course.schedule.endDate} ${course.schedule.weekday || ''} ${course.schedule.startTime || ''}～${course.schedule.endTime || ''}`,
            `報名期間：${formatTaipeiDateTime(course.registration.startTime)}～${formatTaipeiDateTime(course.registration.endTime)}`,
            `費用：${course.fee.isFree ? '免費' : course.fee.description || '未提供'}`,
            `資格：${course.eligibility.allowExternalStudents ? '開放外校' : '限本校'}；${course.eligibility.gradeNames.join('、') || '年級未標示'}`,
        ];
        const links = [
            ['官方詳情', safeUrl(getCourseOfficialUrl(course))],
            ['活動簡章', safeUrl(course.urls?.prospectus)],
            ['報名入口', safeUrl(course.urls?.registration)],
        ].filter(([, url]) => url);
        text.push(`${index + 1}. ${getCourseDisplayTitle(course)}`, ...details, ...links.map(([label, url]) => `${label}：${url}`), '');
        return `<li style="margin-bottom:24px"><h2 style="font-size:17px">${escapeHtml(getCourseDisplayTitle(course))}</h2>${details.map((detail) => `<p style="margin:4px 0">${escapeHtml(detail)}</p>`).join('')}${links.map(([label, url]) => `<a style="display:inline-block;margin:8px 16px 0 0" href="${escapeHtml(url)}">${label}</a>`).join('')}</li>`;
    }).join('');
    const footer = '可回到查詢頁，用同一 email 重新送出條件以更新訂閱。若要停止通知，請回覆此信聯絡管理者。';
    text.push(footer, SITE_URL, '報名資格與名額請以各校公告為準。');
    return {
        subject: weekly ? `育樂營：本週 ${plan.courses.length} 門課程符合你的條件` : `育樂營：今天 ${plan.courses.length} 門符合條件的課程開放報名`,
        text: text.join('\n'),
        html: `<main lang="zh-Hant" style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6;max-width:680px;margin:auto"><h1 style="font-size:22px">${title}</h1><p>${escapeHtml(plan.dateKey)} · ${intro}</p><p>資料更新：${escapeHtml(formatTaipeiDateTime(lastUpdated))}</p><p style="padding:12px;background:#eef2ff">訂閱條件：${escapeHtml(summary)}</p><ol style="padding-left:24px">${items}</ol><p>${footer}</p><p><a href="${SITE_URL}">回到課程查詢</a></p><p style="color:#475569;font-size:12px">報名資格與名額請以各校公告為準。</p></main>`,
    };
}

export function deliveryKey(plan, secret) {
    return createHmac('sha256', secret).update(`${plan.kind}|${plan.dateKey}|${plan.email}`).digest('hex');
}

export async function deliverPlans(plans, { sendMail, from, replyTo, state, secret, saveState, lastUpdated }) {
    let sent = 0;
    let skipped = 0;
    let failed = 0;
    for (const plan of plans) {
        const key = deliveryKey(plan, secret);
        if (state[key]) { skipped += 1; continue; }
        try {
            const result = await sendMail({ from, replyTo, to: { address: plan.email, name: '' }, ...renderNotification(plan, lastUpdated) });
            if (!result.accepted?.length) throw new Error('Recipient was not accepted.');
        } catch {
            // Do not log transport errors: they may contain subscriber addresses.
            failed += 1;
            continue;
        }
        state[key] = plan.dateKey;
        // Persist after each accepted delivery so a retry skips completed recipients.
        await saveState(state);
        sent += 1;
    }
    return { sent, skipped, failed };
}

export async function main(env = process.env) {
    process.env.TZ = TIME_ZONE;
    const dryRun = env.DRY_RUN === 'true';
    const dateKey = env.TARGET_DATE || taipeiDateKey();
    targetDate(dateKey);
    const data = readJson(env.COURSES_FILE || 'data/courses.json');
    const subscribers = await loadSubscribers(env);
    if (!subscribers.length) { console.log('No active subscribers configured. Skipping email.'); return; }
    if (!dryRun) assertFreshCourseData(data, dateKey);
    if (!dryRun && env.CRAWL_STARTED_AT && !(Date.parse(data.lastUpdated) >= Date.parse(env.CRAWL_STARTED_AT))) {
        throw new Error('Course data predates the triggering crawl. Email delivery stopped.');
    }
    if (!Array.isArray(data.courses)) throw new Error('Invalid course data.');
    // Cached/partially refreshed sources must not be presented as newly updated.
    const sourceStates = new Map((data.sourceStatus || []).map((source) => [source.type, source.status]));
    const courses = data.courses.filter((course) => !sourceStates.has(course.source?.type) || sourceStates.get(course.source?.type) === 'updated');
    const plans = buildDeliveryPlans(courses, subscribers, {
        dateKey,
        mode: env.NOTIFICATION_MODE || 'auto',
        now: env.TARGET_DATE ? targetDate(dateKey) : new Date(),
    });
    if (!plans.length) { console.log('No matching courses for the selected notification schedule.'); return; }
    if (dryRun) {
        console.log(`[DRY RUN] ${plans.length} personalized emails; ${subscribers.length} active subscribers. No mail sent or state saved.`);
        console.log(renderNotification({ ...plans[0], courses: plans[0].courses.slice(0, 3) }, data.lastUpdated).text);
        return;
    }
    const missing = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM'].filter((key) => !env[key]);
    if (missing.length) throw new Error(`Missing required SMTP env: ${missing.join(', ')}`);
    const stateFile = env.NOTIFICATION_STATE_FILE || '.cache/notifications/sent.json';
    const state = existsSync(stateFile) ? readJson(stateFile) : {};
    if (!state || typeof state !== 'object' || Array.isArray(state) || Object.entries(state).some(([key, value]) => !/^[a-f0-9]{64}$/.test(key) || typeof value !== 'string')) {
        throw new Error('Invalid notification state; refusing to risk duplicate mail.');
    }
    const transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: Number(env.SMTP_PORT || 587),
        secure: env.SMTP_SECURE === 'true',
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
        connectionTimeout: 30_000,
        socketTimeout: 60_000,
    });
    const result = await deliverPlans(plans, {
        sendMail: (message) => transporter.sendMail(message),
        from: env.MAIL_FROM,
        replyTo: env.MAIL_REPLY_TO || env.MAIL_FROM,
        state,
        secret: env.NOTIFICATION_STATE_SECRET || env.SMTP_PASS,
        lastUpdated: data.lastUpdated,
        saveState: (next) => {
            mkdirSync(dirname(stateFile), { recursive: true });
            writeFileSync(`${stateFile}.tmp`, JSON.stringify(next), { mode: 0o600 });
            renameSync(`${stateFile}.tmp`, stateFile);
        },
    });
    console.log(`Notifications: ${result.sent} sent, ${result.skipped} already delivered, ${result.failed} failed.`);
    if (result.failed) throw new Error('Some notifications failed. Retry with the saved delivery state.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
    main().catch(() => {
        console.error('Notification run failed. Check course freshness, subscriber configuration, SMTP settings and delivery state.');
        process.exitCode = 1;
    });
}
