/**
 * NTPC Camp 育樂營爬蟲
 * 使用 Playwright 爬取新北市中小學寒暑假育樂營資料
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import {
    parseEligibility,
    parseFee,
    parseSchedule,
    parseQuota,
    parseRegistrationStatus
} from './utils.js';
import { markNextPageControl } from './ntpc-pagination.js';
import { crawlTaipeiCamps } from './taipei-crawler.js';
import { crawlUnindexedSchoolCourses } from './ntpc-school-activity-crawler.js';

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
                let currentProspectusUrl = '';
                const courses = [];

                for (const row of rows) {
                    const cells = row.querySelectorAll('td');
                    const text = row.innerText.trim();

                    // 跳過「查無資料」
                    if (text.includes('查無資料')) continue;

                    // 學校標題行 (colspan=7)
                    if (cells.length === 1 && text.includes('新北市')) {
                        const titleCell = cells[0];
                        const prospectusLink = titleCell.querySelector('a[href]');
                        const titleClone = titleCell.cloneNode(true);
                        titleClone.querySelectorAll('a').forEach((link) => link.remove());
                        currentSchool = titleClone.textContent.replace(/\s+/g, ' ').trim();
                        currentProspectusUrl = prospectusLink
                            ? new URL(prospectusLink.getAttribute('href'), window.location.origin).href
                            : '';
                        continue;
                    }

                    // 課程資料行 (7 欄)
                    if (cells.length === 7) {
                        const courseInfo = cells[1];

                        // 解析課程名稱和分類
                        const fonts = Array.from(courseInfo.querySelectorAll('font'));
                        const titleButton = courseInfo.querySelector('[onclick*="ActCls_Detail_Outquery"]');
                        let category = titleButton?.textContent?.trim() || '';
                        let courseName = '';
                        let teacher = '';

                        const subcategory = fonts.find((font) => !(font.textContent || '').includes('教師：'))?.textContent?.trim() || '';
                        const teacherText = fonts.find((font) => (font.textContent || '').includes('教師：'))?.textContent || '';
                        if (subcategory && subcategory !== category) courseName = subcategory;
                        teacher = teacherText.replace(/[()（）]/g, '').replace('教師：', '').trim();

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
                            prospectusUrl: currentProspectusUrl,
                            // 新增欄位
                            schoolId,
                            actId,
                            courseId
                        });
                    }
                }

                return { courses };
            });

            const pagination = await page.evaluate(markNextPageControl);
            Object.assign(pageData, pagination);

            console.log(`      找到 ${pageData.courses.length} 筆課程`);

            // 處理並加入結果
            for (const course of pageData.courses) {
                // 生成 URLs
                const urls = {};
                if (course.schoolId && course.actId && course.courseId) {
                    const detailParams = new URLSearchParams({
                        method: 'ActCls_Ctn',
                        status: 'index_detail_outquery',
                        req_schno: course.schoolId,
                        actmang_no: course.actId,
                        actcls_no: course.courseId,
                        clstea: ''
                    });
                    urls.detail = `https://camp.ntpc.edu.tw/jsp/act_register/ACTClsAction.do?${detailParams.toString()}`;
                    if (course.prospectusUrl) urls.prospectus = course.prospectusUrl;
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
                    registration: parseRegistrationStatus(course.statusRaw, currentROCYear),
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
                await page.waitForFunction((previousPage) => {
                    const activePage = document.querySelector('.pagination .pg_act');
                    return Number.parseInt(activePage?.textContent?.trim() || '', 10) !== previousPage;
                }, pageData.currentPage, { timeout: 30000 });
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

        console.log(`\n   📊 新北市總共找到 ${allCourses.length} 筆課程`);

        // Step 5b: 逐校公開、但未被 Camp 全站索引的所有課程
        console.log('\n5️⃣ 補抓未被 Camp 全站索引的所有逐校公開課程...');
        const schoolActivityOutput = await crawlUnindexedSchoolCourses(allCourses, { now });
        allCourses.push(...schoolActivityOutput.courses);
        console.log(`   ✅ 補入 ${schoolActivityOutput.courses.length} 筆逐校公開課程`);

        // Step 5c: 台北市暑期體驗營
        console.log('\n5️⃣ 補抓台北市暑期體驗營...');
        const taipeiOutput = await crawlTaipeiCamps({ year: currentYear });
        allCourses.push(...taipeiOutput.courses);
        console.log(`   ✅ 台北市找到 ${taipeiOutput.courses.length} 筆梯次課程`);

        // Step 5: 統計與篩選
        console.log('\n5️⃣ 資料統計...');

        const stats = {
            total: allCourses.length,
            allowExternalStudents: allCourses.filter(c => c.eligibility?.allowExternalStudents).length,
            free: allCourses.filter(c => c.fee?.isFree).length,
            canRegister: allCourses.filter(c => c.registration?.status === '可報名').length,
            schools: [...new Set(allCourses.map(c => c.schoolName))].length
        };

        console.log(`   🏫 學校/單位數量: ${stats.schools}`);
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

        writeFileSync('data/taipei-courses.json', JSON.stringify(taipeiOutput, null, 2));
        console.log('   ✅ 已保存台北市課程至 data/taipei-courses.json');

        schoolActivityOutput.report.sourceDataUpdatedAt = output.lastUpdated;
        writeFileSync('data/unindexed-activities.json', JSON.stringify(schoolActivityOutput.report, null, 2));
        console.log('   ✅ 已保存未索引活動稽核至 data/unindexed-activities.json');

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
