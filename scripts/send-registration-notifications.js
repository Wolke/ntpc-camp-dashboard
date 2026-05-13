#!/usr/bin/env node

import { readFileSync, existsSync } from 'node:fs';
import process from 'node:process';
import nodemailer from 'nodemailer';

const TIME_ZONE = 'Asia/Taipei';
const COURSES_FILE = process.env.COURSES_FILE || 'data/courses.json';
const SUBSCRIBERS_FILE = process.env.SUBSCRIBERS_FILE || 'data/subscribers.json';

function taipeiDateKey(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date);

    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
}

function formatTaipeiDateTime(dateStr) {
    if (!dateStr) return '未提供';
    return new Date(dateStr).toLocaleString('zh-TW', {
        timeZone: TIME_ZONE,
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function readJson(filePath) {
    return JSON.parse(readFileSync(filePath, 'utf8'));
}

function normalizeSubscribers(input) {
    const items = Array.isArray(input) ? input : input.subscribers;
    if (!Array.isArray(items)) return [];

    return items
        .map((item) => typeof item === 'string' ? item : item.email)
        .filter((email) => typeof email === 'string' && email.includes('@'))
        .map((email) => email.trim().toLowerCase())
        .filter((email, index, array) => array.indexOf(email) === index);
}

async function fetchSubscribers(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch subscribers: ${response.status} ${response.statusText}`);
    }

    const payload = await response.json();
    if (payload.ok === false) {
        throw new Error(`Failed to fetch subscribers: ${payload.error || 'unknown_error'}`);
    }

    return normalizeSubscribers(payload);
}

async function loadSubscribers() {
    if (process.env.SUBSCRIBERS_JSON) {
        return normalizeSubscribers(JSON.parse(process.env.SUBSCRIBERS_JSON));
    }

    if (process.env.SUBSCRIBERS_JSON_URL) {
        return fetchSubscribers(process.env.SUBSCRIBERS_JSON_URL);
    }

    if (existsSync(SUBSCRIBERS_FILE)) {
        return normalizeSubscribers(readJson(SUBSCRIBERS_FILE));
    }

    return [];
}

function coursesOpeningOn(courses, dateKey) {
    return courses.filter((course) => {
        if (!course.registration?.startTime) return false;
        return taipeiDateKey(new Date(course.registration.startTime)) === dateKey;
    });
}

function renderText(courses, dateKey) {
    const lines = [
        `新北市育樂營報名開放通知 (${dateKey})`,
        '',
        `今天共有 ${courses.length} 個活動/課程開放報名：`,
        '',
    ];

    courses.forEach((course, index) => {
        lines.push(`${index + 1}. ${course.category || course.courseName}`);
        lines.push(`   學校/單位：${course.schoolName}`);
        lines.push(`   課程日期：${course.schedule.startDate} - ${course.schedule.endDate}`);
        lines.push(`   報名期間：${formatTaipeiDateTime(course.registration.startTime)} - ${formatTaipeiDateTime(course.registration.endTime)}`);
        lines.push(`   費用：${course.fee?.description || (course.fee?.isFree ? '免費' : '未提供')}`);
        if (course.eligibility?.allowExternalStudents) lines.push('   開放外校生：是');
        if (course.urls?.prospectus) lines.push(`   活動簡章：${course.urls.prospectus}`);
        if (course.urls?.registration) lines.push(`   報名入口：${course.urls.registration}`);
        lines.push('');
    });

    lines.push('此信由新北育樂營查詢系統自動寄出。');
    return lines.join('\n');
}

function escapeHtml(text) {
    return String(text)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}

function renderHtml(courses, dateKey) {
    const items = courses.map((course) => `
        <li style="margin: 0 0 18px;">
            <h2 style="font-size: 16px; margin: 0 0 6px;">${escapeHtml(course.category || course.courseName)}</h2>
            <p style="margin: 0 0 4px;">學校/單位：${escapeHtml(course.schoolName)}</p>
            <p style="margin: 0 0 4px;">課程日期：${escapeHtml(course.schedule.startDate)} - ${escapeHtml(course.schedule.endDate)}</p>
            <p style="margin: 0 0 4px;">報名期間：${escapeHtml(formatTaipeiDateTime(course.registration.startTime))} - ${escapeHtml(formatTaipeiDateTime(course.registration.endTime))}</p>
            <p style="margin: 0 0 4px;">費用：${escapeHtml(course.fee?.description || (course.fee?.isFree ? '免費' : '未提供'))}</p>
            ${course.eligibility?.allowExternalStudents ? '<p style="margin: 0 0 4px;">開放外校生：是</p>' : ''}
            ${course.urls?.prospectus ? `<p style="margin: 0 0 4px;"><a href="${escapeHtml(course.urls.prospectus)}">活動簡章</a></p>` : ''}
            ${course.urls?.registration ? `<p style="margin: 0;"><a href="${escapeHtml(course.urls.registration)}">前往報名入口</a></p>` : ''}
        </li>
    `).join('');

    return `
        <main style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0f172a; line-height: 1.5;">
            <h1 style="font-size: 20px; margin: 0 0 8px;">新北市育樂營報名開放通知</h1>
            <p style="margin: 0 0 18px;">${escapeHtml(dateKey)} 共有 ${courses.length} 個活動/課程開放報名。</p>
            <ol style="padding-left: 22px; margin: 0;">${items}</ol>
            <p style="margin-top: 24px; color: #64748b; font-size: 12px;">此信由新北育樂營查詢系統自動寄出。</p>
        </main>
    `;
}

async function main() {
    const dateKey = process.env.TARGET_DATE || taipeiDateKey();
    const coursesData = readJson(COURSES_FILE);
    const courses = coursesOpeningOn(coursesData.courses || [], dateKey);

    if (courses.length === 0) {
        console.log(`No courses opening registration on ${dateKey}.`);
        return;
    }

    const subscribers = await loadSubscribers();
    if (subscribers.length === 0) {
        console.log('No subscribers configured. Skipping email.');
        return;
    }

    if (process.env.DRY_RUN === 'true') {
        console.log(`[DRY RUN] Would send ${courses.length} courses for ${dateKey} to ${subscribers.length} subscribers.`);
        console.log(renderText(courses.slice(0, 3), dateKey));
        return;
    }

    const requiredEnv = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM'];
    const missing = requiredEnv.filter((key) => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing required SMTP env: ${missing.join(', ')}`);
    }

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: process.env.MAIL_TO || process.env.MAIL_FROM,
        bcc: subscribers,
        subject: `新北育樂營：今天 ${courses.length} 個活動開放報名`,
        text: renderText(courses, dateKey),
        html: renderHtml(courses, dateKey),
    });

    console.log(`Sent registration notification for ${dateKey} to ${subscribers.length} subscribers.`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
