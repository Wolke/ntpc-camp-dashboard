/**
 * Taipei Holiday Camp crawler
 * Parses the static camps_all HTML and maps each echelon to the shared Course shape.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { parseEligibility, parseFee } from './utils.js';

const TAIPEI_BASE_URL = 'https://holiday.tp.edu.tw';
const TAIPEI_CAMPS_URL = `${TAIPEI_BASE_URL}/camps_all`;

const GRADE_NAME_TO_NUMBER = {
    '一年級': 1,
    '二年級': 2,
    '三年級': 3,
    '四年級': 4,
    '五年級': 5,
    '六年級': 6,
};

function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function parseInfoTable($, root) {
    const result = {};
    $(root).find('tr').each((_, row) => {
        const key = normalizeText($(row).find('th').first().text());
        const value = normalizeText($(row).find('td').first().text());
        if (key) result[key] = value;
    });
    return result;
}

function parseGradeNames($, cell) {
    const gradeNames = $(cell).find('img[alt]').map((_, img) => $(img).attr('alt')).get();
    if (gradeNames.length > 0) return gradeNames;

    return normalizeText($(cell).text())
        .split(/[、,，\s]+/)
        .map((name) => name.trim())
        .filter(Boolean);
}

function parseTaipeiDateRange(value, year) {
    const match = normalizeText(value).match(/(\d{1,2})\/(\d{1,2})\s*[~～-]\s*(\d{1,2})\/(\d{1,2})/);
    if (!match) return { startDate: null, endDate: null };

    const [, startMonth, startDay, endMonth, endDay] = match;
    return {
        startDate: `${year}-${startMonth.padStart(2, '0')}-${startDay.padStart(2, '0')}`,
        endDate: `${year}-${endMonth.padStart(2, '0')}-${endDay.padStart(2, '0')}`,
    };
}

function parseTaipeiTime(value) {
    const text = normalizeText(value);
    if (text.includes('全天')) {
        return { startTime: '08:30', endTime: '16:30' };
    }

    const match = text.match(/(\d{1,2}:\d{2})\s*[~～-]\s*(\d{1,2}:\d{2})/);
    if (match) {
        return { startTime: match[1], endTime: match[2] };
    }

    return { startTime: '', endTime: '' };
}

function parseTaipeiEligibility(gradeNames, allowExternalStudents) {
    const grades = gradeNames
        .map((name) => GRADE_NAME_TO_NUMBER[name])
        .filter((grade) => Number.isInteger(grade));

    return {
        ...parseEligibility(`${grades.join(',')}${allowExternalStudents ? ',外校學生' : ''}`),
        grades,
        gradeNames,
        allowExternalStudents,
    };
}

function toAbsoluteUrl(url) {
    if (!url) return undefined;
    return new URL(url, TAIPEI_BASE_URL).toString();
}

function getTableRows($, panel) {
    const rows = {};

    $(panel).find('.box-body table').first().find('tr').each((_, row) => {
        const th = normalizeText($(row).find('th').first().text());
        const td = $(row).find('td').first();

        if (!th) return;

        if (th === '適合年級') {
            rows[th] = parseGradeNames($, td);
        } else {
            rows[th] = normalizeText(td.text());
        }
    });

    return rows;
}

export async function crawlTaipeiCamps(options = {}) {
    const year = options.year || new Date().getFullYear();
    const html = options.html || (await axios.get(TAIPEI_CAMPS_URL, {
        timeout: 60000,
        responseType: 'text',
        headers: {
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
    })).data;

    const $ = cheerio.load(html);
    const courses = [];
    const topLevelBoxes = $('.col-xs-12.col-md-6 > .box[class*=box-camp]');
    const registrationStatusText = normalizeText($('.callout').first().text());

    topLevelBoxes.each((_, boxElement) => {
        const box = $(boxElement);
        const campTitle = normalizeText(box.find('> .box-header .box-title').first().text());
        const detailHref = box.find('a[href^="camp?NBR="]').first().attr('href') || '';
        const campId = detailHref.match(/NBR=(\d+)/)?.[1] || '';
        const detailUrl = toAbsoluteUrl(detailHref);
        const campInfo = parseInfoTable($, box.find('> .box-body .tab-pane[id^=data_] table').first());
        const schoolName = campInfo['主辦學校'] ? `臺北市${campInfo['主辦學校']}` : '臺北市';
        const plannedSeats =
            (parseInt(campInfo['一般生'], 10) || 0) +
            (parseInt(campInfo['關懷生'], 10) || 0) +
            (parseInt(campInfo['新北基'], 10) || 0);
        const allowExternalStudents = (parseInt(campInfo['新北基'], 10) || 0) > 0;

        box.find('> .box-body .tab-pane[id^=echelon_] .panel.box').each((__, panelElement) => {
            const panel = $(panelElement);
            const panelId = panel.find('.panel-collapse').first().attr('data-ech_nbr') || '';
            const rows = getTableRows($, panel);
            const echelon = rows['梯次'] || normalizeText(panel.find('.box-title').first().text()).match(/第\s*(\d+)\s*梯次/)?.[1] || '';
            const { startDate, endDate } = parseTaipeiDateRange(rows['日期起~迄'], year);
            const { startTime, endTime } = parseTaipeiTime(rows['時間']);
            const gradeNames = Array.isArray(rows['適合年級']) ? rows['適合年級'] : [];
            const noteUrl = toAbsoluteUrl(panel.find('a[href$=".pdf"]').first().attr('href'));
            const fee = parseFee(rows['一般生費用']);
            const courseTitle = `${campTitle}${echelon ? ` 第${echelon}梯次` : ''}`;

            courses.push({
                source: {
                    type: 'taipei_holiday',
                    name: '臺北市國民小學暑期體驗營',
                    url: TAIPEI_CAMPS_URL,
                    schoolId: null,
                    actId: campId || null,
                    courseId: panelId || null,
                },
                school: `${schoolName} - ${campTitle}`,
                schoolName,
                campName: campTitle,
                originalSchool: `${schoolName} - ${campTitle}`,
                address: '',
                category: campTitle,
                courseName: courseTitle,
                teacher: '',
                schedule: {
                    startDate,
                    endDate,
                    weekday: '',
                    startTime,
                    endTime,
                },
                fee,
                eligibility: parseTaipeiEligibility(gradeNames, allowExternalStudents),
                quota: {
                    enrolled: 0,
                    planned: plannedSeats,
                    actual: 0,
                    isLottery: true,
                },
                registration: {
                    method: '臺北市暑期體驗營網站',
                    canRegister: registrationStatusText.includes('報名區間'),
                    canWithdraw: false,
                    startTime: `${year}-05-01T00:00:00+08:00`,
                    endTime: `${year}-05-18T00:00:00+08:00`,
                    lotteryTime: `${year}-05-18T00:00:00+08:00`,
                    isLottery: true,
                    status: registrationStatusText.includes('報名區間') ? '可報名' : '未知',
                },
                urls: {
                    detail: detailUrl,
                    registration: TAIPEI_CAMPS_URL,
                    prospectus: noteUrl,
                },
                tags: ['台北市', campInfo['住宿'] === '是' ? '住宿' : '不住宿'].filter(Boolean),
                _raw: {
                    schedule: `${rows['日期起~迄'] || ''}\n${rows['時間'] || ''}`.trim(),
                    fee: rows['一般生費用'] || '',
                    eligibility: gradeNames.join(','),
                    quota: `一般生:${campInfo['一般生'] || 0}\n關懷生:${campInfo['關懷生'] || 0}\n新北基:${campInfo['新北基'] || 0}`,
                    status: registrationStatusText,
                },
            });
        });
    });

    return {
        lastUpdated: new Date().toISOString(),
        stats: {
            total: courses.length,
            allowExternalStudents: courses.filter((course) => course.eligibility.allowExternalStudents).length,
            free: courses.filter((course) => course.fee.isFree).length,
            canRegister: courses.filter((course) => course.registration.status === '可報名').length,
            schools: [...new Set(courses.map((course) => course.schoolName))].length,
        },
        courses,
    };
}
