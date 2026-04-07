/**
 * NTPC Camp 育樂營爬蟲
 * 使用 Playwright 爬取新北市中小學寒暑假育樂營資料
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import {
    rocToISODate,
    parseEligibility,
    parseFee,
    parseSchedule,
    parseQuota,
    parseRegistrationStatus
} from './utils.js';

const BASE_URL = 'https://camp.ntpc.edu.tw';
const ACTION_URL = `${BASE_URL}/jsp/act_register/ACTMangAction.do`;

/**
 * 主爬蟲函數
 */
async function crawlNTPCCamp() {
    console.log('🚀 NTPC Camp 爬蟲啟動\n');
    console.log(`⏰ 開始時間: ${new Date().toISOString()}\n`);

    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    const allCourses = [];
    let currentSchool = '';

    try {
        // Step 1: 訪問主網頁 (不帶 schno 參數以顯示完整篩選介面)
        console.log('1️⃣ 訪問主頁面...');
        await page.goto(`${BASE_URL}/`, {
            waitUntil: 'networkidle',
            timeout: 60000
        });
        console.log('   ✅ 頁面載入完成');

        // Step 2: 設定搜尋條件
        console.log('\n2️⃣ 設定搜尋條件...');

        // 計算當前年份
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentROCYear = currentYear - 1911;

        await page.evaluate(({ rocYear, adYear }) => {
            // 設定顯示用的日期欄位 (民國年格式)
            const bgnDesc = document.getElementById('bgndate_desc');
            const endDesc = document.getElementById('enddate_desc');
            if (bgnDesc) bgnDesc.value = `${rocYear}/01/01`;
            if (endDesc) endDesc.value = `${rocYear}/12/31`;

            // 重要！隱藏欄位使用西元年 YYYYMMDD 格式
            const bgnHidden = document.getElementById('bgndate');
            const endHidden = document.getElementById('enddate');
            if (bgnHidden) bgnHidden.value = `${adYear}0101`;
            if (endHidden) endHidden.value = `${adYear}1231`;

            // 所有學校
            const findsch = document.getElementById('findsch');
            if (findsch) findsch.value = 'all';

            // 所有區域
            const subarea = document.getElementById('subarea');
            if (subarea) subarea.value = 'all';

            // 不勾選已結束課程 (查詢進行中的課程)
            const queryHistory = document.getElementById('queryHistory');
            if (queryHistory) queryHistory.checked = false;
        }, { rocYear: currentROCYear, adYear: currentYear });

        console.log(`   ✅ 日期範圍: ${currentROCYear}/01/01 - ${currentROCYear}/12/31 (${currentYear})`);

        // Step 3: 執行查詢 (使用正確的函數)
        console.log('\n3️⃣ 執行查詢...');

        // 使用 subPage('now', 1) 觸發 AJAX 查詢
        const searchResult = await page.evaluate(() => {
            if (typeof subPage === 'function') {
                try {
                    subPage('now', 1);
                    return 'subPage_success';
                } catch (e) {
                    return 'subPage_error: ' + e.message;
                }
            }
            return 'subPage_not_found';
        });

        console.log(`   查詢方式: ${searchResult}`);
        // Step 4: 等待資料載入並檢查
        console.log('\n4️⃣ 等待資料載入...');

        // 等待表格出現並有資料
        await page.waitForTimeout(5000);

        // 除錯：檢查表格狀態
        const tableStatus = await page.evaluate(() => {
            const table = document.getElementById('clslist_tb');
            if (!table) return { exists: false };

            const tbody = table.querySelector('tbody');
            const rows = tbody ? tbody.querySelectorAll('tr') : [];

            // 取得每行的 class 和 td 數量
            const rowInfo = Array.from(rows).slice(0, 5).map(r => ({
                tdCount: r.querySelectorAll('td').length,
                text: r.innerText.substring(0, 100).replace(/\s+/g, ' ')
            }));

            return {
                exists: true,
                rowCount: rows.length,
                sampleRows: rowInfo
            };
        });

        console.log(`   表格狀態: ${JSON.stringify(tableStatus, null, 2)}`);

        if (tableStatus.rowCount <= 2) {
            console.log('   ⚠️ 表格資料未載入，嘗試重新查詢...');

            // 再次嘗試點擊查詢
            await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const searchBtn = buttons.find(b => b.textContent.includes('查詢'));
                if (searchBtn) searchBtn.click();
            });

            await page.waitForTimeout(5000);
        }

        // Step 5: 解析資料（處理分頁）
        console.log('\n5️⃣ 解析資料...');

        let hasMorePages = true;
        let pageNum = 1;

        while (hasMorePages) {
            console.log(`   📄 處理第 ${pageNum} 頁...`);

            const pageData = await page.evaluate(() => {
                const table = document.getElementById('clslist_tb');
                if (!table) return { courses: [], hasNextPage: false };

                const tbody = table.querySelector('tbody');
                const rows = tbody ? Array.from(tbody.querySelectorAll('tr')) : [];

                let currentSchool = '';
                const courses = [];

                for (const row of rows) {
                    const cells = row.querySelectorAll('td');
                    const text = row.innerText.trim();

                    // 跳過「查無資料」
                    if (text.includes('查無資料')) continue;

                    // 學校標題行 (colspan=7)
                    if (cells.length === 1 && text.includes('新北市')) {
                        currentSchool = text;
                        continue;
                    }

                    // 課程資料行 (7 欄)
                    if (cells.length === 7) {
                        const courseInfo = cells[1];

                        // 解析課程名稱和分類
                        const fonts = courseInfo.querySelectorAll('font');
                        let category = '';
                        let courseName = '';
                        let teacher = '';

                        if (fonts.length >= 1) category = fonts[0]?.innerText?.trim() || '';
                        if (fonts.length >= 2) courseName = fonts[1]?.innerText?.trim() || '';
                        if (fonts.length >= 3) teacher = fonts[2]?.innerText?.replace(/[()（）]/g, '').replace('教師：', '').trim() || '';

                        // 從 onclick 屬性提取 IDs 用於生成 URLs
                        // 格式: ActCls_Detail_Outquery('schoolId', 'actId', 'courseId', '')
                        let schoolId = '';
                        let actId = '';
                        let courseId = '';

                        // 嘗試從課程名稱連結或表格行找 onclick
                        const clickableElement = courseInfo.querySelector('[onclick*="ActCls_Detail_Outquery"]')
                            || courseInfo.querySelector('font[title]')?.parentElement;
                        const onclickAttr = clickableElement?.getAttribute('onclick') || '';
                        const idMatch = onclickAttr.match(/ActCls_Detail_Outquery\('(\d+)',\s*'(\d+)',\s*'(\d+)'/);

                        if (idMatch) {
                            [, schoolId, actId, courseId] = idMatch;
                        }

                        courses.push({
                            school: currentSchool,
                            id: cells[0]?.innerText?.trim() || '',
                            category,
                            courseName,
                            teacher,
                            scheduleRaw: cells[2]?.innerText?.trim() || '',
                            feeRaw: cells[3]?.innerText?.trim() || '',
                            eligibilityRaw: cells[4]?.innerText?.trim() || '',
                            quotaRaw: cells[5]?.innerText?.trim() || '',
                            statusRaw: cells[6]?.innerText?.trim() || '',
                            // 新增欄位
                            schoolId,
                            actId,
                            courseId
                        });
                    }
                }

                // 檢查是否有下一頁
                // 邏輯：
                // 1. 找到當前頁碼 (class="pg_act")
                // 2. 尋找下一頁頁碼按鈕
                // 3. 如果找不到，尋找 "下十頁" 按鈕

                let nextBtnSelector = null;
                const currentPageSpan = document.querySelector('span.pg_act');
                const currentPage = currentPageSpan ? parseInt(currentPageSpan.innerText) : 1;
                const nextPage = currentPage + 1;

                // 找下一頁按鈕 (span 且文字為下一頁頁碼)
                const pageBtns = Array.from(document.querySelectorAll('span[onclick*="subPage"]'));
                const nextPageBtn = pageBtns.find(el => el.innerText.trim() === nextPage.toString());

                if (nextPageBtn) {
                    // 標記一下，方便後面 click
                    nextPageBtn.setAttribute('data-next-page', 'true');
                    nextBtnSelector = 'span[data-next-page="true"]';
                } else {
                    // 找不到下一頁號碼，可能是 "下十頁" 或 "下一頁"
                    const jumpBtn = pageBtns.find(el => el.innerText.includes('下一頁') || el.innerText.includes('下十頁'));
                    if (jumpBtn) {
                        jumpBtn.setAttribute('data-jump-page', 'true');
                        nextBtnSelector = 'span[data-jump-page="true"]';
                    }
                }

                return { courses, hasNextPage: !!nextBtnSelector, nextBtnSelector };
            });

            console.log(`      找到 ${pageData.courses.length} 筆課程`);

            // 處理並加入結果
            for (const course of pageData.courses) {
                // 生成 URLs
                const urls = {};
                if (course.schoolId && course.actId && course.courseId) {
                    urls.detail = `https://camp.ntpc.edu.tw/jsp/act_register/ACTMangAction.do?method=ActCls_Detail_Outquery&schno=${course.schoolId}&act_no=${course.actId}&cls_no=${course.courseId}`;
                    urls.prospectus = `https://camp.ntpc.edu.tw/central/${course.schoolId}/uploadfile/act_register/public/file/${course.actId}-${course.courseId}-clsfile.PDF`;
                    urls.registration = 'https://camp.ntpc.edu.tw/';
                }

                const processed = {
                    // 來源資訊
                    source: {
                        type: 'ntpc_camp',
                        name: '新北市寒暑假育樂營',
                        url: 'https://camp.ntpc.edu.tw/',
                        schoolId: course.schoolId || null,
                        actId: course.actId || null,
                        courseId: course.courseId || null
                    },
                    // 解析學校名稱和營隊名稱 (格式: "學校名稱 - 營隊名稱")
                    school: course.school,
                    schoolName: course.school?.split(' - ')[0]?.trim() || course.school,
                    campName: course.school?.split(' - ')[1]?.trim() || '',
                    originalSchool: course.school,
                    address: '', // 可從詳細頁面取得，暫時留空
                    category: course.category,
                    courseName: course.courseName,
                    teacher: course.teacher,
                    schedule: parseSchedule(course.scheduleRaw),
                    fee: parseFee(course.feeRaw),
                    eligibility: parseEligibility(course.eligibilityRaw),
                    quota: parseQuota(course.quotaRaw),
                    registration: parseRegistrationStatus(course.statusRaw, 114),
                    // 連結 (新增)
                    urls: Object.keys(urls).length > 0 ? urls : null,
                    // 標籤 (可擴展)
                    tags: [],
                    // 保留原始資料供除錯
                    _raw: {
                        schedule: course.scheduleRaw,
                        fee: course.feeRaw,
                        eligibility: course.eligibilityRaw,
                        quota: course.quotaRaw,
                        status: course.statusRaw
                    }
                };
                allCourses.push(processed);
            }

            // 處理分頁
            if (pageData.hasNextPage) {
                console.log(`      👉 前往下一頁... (使用選擇器: ${pageData.nextBtnSelector})`);
                console.log(`      📊 累計課程: ${allCourses.length} 筆`);

                await page.click(pageData.nextBtnSelector);
                await page.waitForTimeout(5000);
                pageNum++;
            } else {
                console.log('      🏁 已無下一頁');
                console.log(`      📊 本次總計: ${allCourses.length} 筆課程`);
                hasMorePages = false;
            }

            // 安全限制：最多 100 頁
            if (pageNum > 100) {
                console.log('   ⚠️ 達到最大頁數限制');
                break;
            }
        }

        console.log(`\n   📊 總共找到 ${allCourses.length} 筆課程`);

        // Step 5: 統計與篩選
        console.log('\n5️⃣ 資料統計...');

        const stats = {
            total: allCourses.length,
            allowExternalStudents: allCourses.filter(c => c.eligibility?.allowExternalStudents).length,
            free: allCourses.filter(c => c.fee?.isFree).length,
            canRegister: allCourses.filter(c => c.registration?.status === '可報名').length,
            schools: [...new Set(allCourses.map(c => c.school))].length
        };

        console.log(`   🏫 學校數量: ${stats.schools}`);
        console.log(`   📚 課程總數: ${stats.total}`);
        console.log(`   🌐 開放外校: ${stats.allowExternalStudents}`);
        console.log(`   💰 免費課程: ${stats.free}`);
        console.log(`   ✅ 可報名: ${stats.canRegister}`);

        // Step 6: 輸出結果
        console.log('\n6️⃣ 輸出結果...');

        const output = {
            lastUpdated: new Date().toISOString(),
            stats,
            courses: allCourses
        };

        mkdirSync('data', { recursive: true });
        writeFileSync('data/courses.json', JSON.stringify(output, null, 2));
        console.log('   ✅ 已保存至 data/courses.json');

        // 另外輸出一份「開放外校學生」的課程
        const externalCourses = {
            lastUpdated: new Date().toISOString(),
            description: '開放外校學生報名的課程',
            total: stats.allowExternalStudents,
            courses: allCourses.filter(c => c.eligibility?.allowExternalStudents)
        };
        writeFileSync('data/external-courses.json', JSON.stringify(externalCourses, null, 2));
        console.log('   ✅ 已保存外校課程至 data/external-courses.json');

        // 截圖
        await page.screenshot({ path: 'data/screenshot.png', fullPage: true });
        console.log('   ✅ 已保存截圖');

        console.log('\n✅ 爬蟲完成!');
        console.log(`⏰ 結束時間: ${new Date().toISOString()}`);

        return output;

    } catch (error) {
        console.error('❌ 爬蟲錯誤:', error.message);
        await page.screenshot({ path: 'data/error-screenshot.png' }).catch(() => { });
        throw error;
    } finally {
        await browser.close();
    }
}

// 執行
crawlNTPCCamp().catch(console.error);
