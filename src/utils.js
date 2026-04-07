/**
 * 工具函數模組
 * - 民國年轉西元年
 * - 年級代碼對應
 * - 資料解析
 */

/**
 * 民國年轉西元年
 * @param {string} rocDate - 民國年格式 "115/02/03"
 * @returns {string} ISO 格式 "2026-02-03"
 */
export function rocToISODate(rocDate) {
    if (!rocDate || typeof rocDate !== 'string') return null;

    const match = rocDate.match(/^(\d+)\/(\d+)\/(\d+)$/);
    if (!match) return null;

    const [, rocYear, month, day] = match;
    const adYear = parseInt(rocYear) + 1911;
    return `${adYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/**
 * 解析民國年日期時間
 * @param {string} dateTimeStr - "115/02/03 12:00" 或 "12/29 12:00"
 * @param {number} baseYear - 基準年（當沒有年份時使用）
 * @returns {string} ISO 8601 格式
 */
export function parseROCDateTime(dateTimeStr, baseYear = 115) {
    if (!dateTimeStr) return null;

    // 處理 "MM/DD HH:mm" 格式 (無年份)
    const shortMatch = dateTimeStr.match(/^(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})$/);
    if (shortMatch) {
        const [, month, day, hour, minute] = shortMatch;
        const adYear = baseYear + 1911;
        return `${adYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute}:00+08:00`;
    }

    // 處理 "YYY/MM/DD HH:mm" 格式
    const fullMatch = dateTimeStr.match(/^(\d+)\/(\d+)\/(\d+)\s+(\d{1,2}):(\d{2})$/);
    if (fullMatch) {
        const [, rocYear, month, day, hour, minute] = fullMatch;
        const adYear = parseInt(rocYear) + 1911;
        return `${adYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute}:00+08:00`;
    }

    return null;
}

/**
 * 年級代碼對應表
 */
export const GRADE_MAP = {
    1: '一年級',
    2: '二年級',
    3: '三年級',
    4: '四年級',
    5: '五年級',
    6: '六年級',
    7: '七年級',
    8: '八年級',
    9: '九年級',
    10: '高一',
    11: '高二',
    12: '高三'
};

/**
 * 解析年級資格字串
 * @param {string} eligibilityText - "7,8,9,外校學生- 限制本縣市學生"
 * @returns {object}
 */
export function parseEligibility(eligibilityText) {
    if (!eligibilityText) return { grades: [], gradeNames: [], allowExternalStudents: false, restrictions: [] };

    const result = {
        grades: [],
        gradeNames: [],
        allowExternalStudents: false,
        restrictions: []
    };

    // 檢查是否允許外校學生
    result.allowExternalStudents = eligibilityText.includes('外校學生');

    // 提取限制條件
    const restrictionMatch = eligibilityText.match(/[-–—]\s*(.+)$/);
    if (restrictionMatch) {
        result.restrictions = [restrictionMatch[1].trim()];
    }

    // 提取年級
    const gradeMatches = eligibilityText.match(/\d+/g);
    if (gradeMatches) {
        result.grades = gradeMatches.map(g => parseInt(g)).filter(g => g >= 1 && g <= 12);
        result.gradeNames = result.grades.map(g => GRADE_MAP[g] || `${g}年級`);
    }

    return result;
}

/**
 * 解析費用
 * @param {string} feeText - "免費參加" 或 "500元"
 * @returns {object}
 */
export function parseFee(feeText) {
    if (!feeText) return { amount: 0, isFree: true, description: '' };

    const text = feeText.trim();

    if (text.includes('免費') || text === '0' || text === '') {
        return { amount: 0, isFree: true, description: text || '免費參加' };
    }

    const amountMatch = text.match(/(\d+)/);
    const amount = amountMatch ? parseInt(amountMatch[1]) : 0;

    return {
        amount,
        isFree: amount === 0,
        description: text
    };
}

/**
 * 解析報名狀態
 * @param {string} statusText - 包含報名方式、期間等
 * @param {number} baseYear - 基準民國年
 * @returns {object}
 */
export function parseRegistrationStatus(statusText, baseYear = 115) {
    if (!statusText) return {};

    const result = {
        method: '',
        canRegister: false,
        canWithdraw: false,
        startTime: null,
        endTime: null,
        lotteryTime: null,
        isLottery: false,
        status: ''
    };

    // 報名方式
    if (statusText.includes('網路線上報名')) {
        result.method = '網路線上報名';
    }

    // 可報名/退選
    result.canRegister = statusText.includes('可報名');
    result.canWithdraw = statusText.includes('退選');

    // 抽籤
    result.isLottery = statusText.includes('抽籤');

    // 解析報名期間 "MM/DD HH:mm 至 MM/DD HH:mm"
    const periodMatch = statusText.match(/(\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2})\s*至\s*(\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2})/);
    if (periodMatch) {
        result.startTime = parseROCDateTime(periodMatch[1], baseYear);
        result.endTime = parseROCDateTime(periodMatch[2], baseYear);
    }

    // 抽籤公布時間
    const lotteryMatch = statusText.match(/(\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2}).*公布/);
    if (lotteryMatch) {
        result.lotteryTime = parseROCDateTime(lotteryMatch[1], baseYear);
    }

    // 狀態判斷
    if (statusText.includes('截止報名') || statusText.includes('已截止')) {
        result.status = '已截止';
    } else if (statusText.includes('可報名')) {
        result.status = '可報名';
    } else if (statusText.includes('額滿')) {
        result.status = '額滿';
    } else {
        result.status = '未知';
    }

    return result;
}

/**
 * 解析錄取名額
 * @param {string} quotaText
 * @returns {object}
 */
export function parseQuota(quotaText) {
    if (!quotaText) return { enrolled: 0, planned: 0, actual: 0, isLottery: false };

    const result = {
        enrolled: 0,
        planned: 0,
        actual: 0,
        isLottery: quotaText.includes('抽籤')
    };

    const enrolledMatch = quotaText.match(/報名人數[：:]\s*(\d+)/);
    if (enrolledMatch) result.enrolled = parseInt(enrolledMatch[1]);

    const plannedMatch = quotaText.match(/預計錄取[：:]\s*(\d+)/);
    if (plannedMatch) result.planned = parseInt(plannedMatch[1]);

    const actualMatch = quotaText.match(/實際錄取[：:]\s*(\d+)/);
    if (actualMatch) result.actual = parseInt(actualMatch[1]);

    return result;
}

/**
 * 解析課程日期時段
 * @param {string} scheduleText - "115/02/03 至 115/02/03\n週二 08:30~16:00"
 * @returns {object}
 */
export function parseSchedule(scheduleText) {
    if (!scheduleText) return {};

    const result = {
        startDate: null,
        endDate: null,
        weekday: '',
        startTime: '',
        endTime: ''
    };

    // 解析日期範圍
    const dateMatch = scheduleText.match(/(\d+\/\d+\/\d+)\s*至\s*(\d+\/\d+\/\d+)/);
    if (dateMatch) {
        result.startDate = rocToISODate(dateMatch[1]);
        result.endDate = rocToISODate(dateMatch[2]);
    }

    // 解析時段
    const timeMatch = scheduleText.match(/(週[一二三四五六日])\s*(\d{1,2}:\d{2})[~～-](\d{1,2}:\d{2})/);
    if (timeMatch) {
        result.weekday = timeMatch[1];
        result.startTime = timeMatch[2];
        result.endTime = timeMatch[3];
    }

    return result;
}
