/**
 * Phase 1: Playwright 爬蟲測試 (正確參數版)
 * 
 * 關鍵發現：
 * - 不要勾選「已結束課程」(queryHistory = false)
 * - 日期範圍設定為 114/01/01 到 115/12/31
 * - 使用 schno=019999 (特定學校) 有資料
 */

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';

const BASE_URL = 'https://camp.ntpc.edu.tw/jsp/act_register/ACTMangAction.do';

async function testPlaywrightCrawl() {
    console.log('🚀 Phase 1: Playwright 爬蟲測試 (正確參數版)\n');

    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    try {
        // Step 1: 訪問特定學校頁面
        console.log('1️⃣ 訪問頁面 (schno=019999)...');
        await page.goto(`${BASE_URL}?method=ActMang_OutIndex&schno=019999`, {
            waitUntil: 'networkidle',
            timeout: 30000
        });
        console.log('   ✅ 頁面載入完成');

        // Step 2: 設定搜尋條件 (關鍵: 不勾選已結束課程)
        console.log('\n2️⃣ 設定搜尋條件...');

        await page.evaluate(() => {
            // 學校選擇所有
            const findsch = document.getElementById('findsch');
            if (findsch) findsch.value = '019999';

            // 區域選擇所有  
            const subarea = document.getElementById('subarea');
            if (subarea) subarea.value = 'all';

            // 設定日期範圍 (重要！使用 114-115 年)
            const bgnDesc = document.getElementById('bgndate_desc');
            const endDesc = document.getElementById('enddate_desc');
            if (bgnDesc) bgnDesc.value = '113/01/01';
            if (endDesc) endDesc.value = '115/12/31';

            const bgnHidden = document.getElementsByName('bgndate')[0];
            const endHidden = document.getElementsByName('enddate')[0];
            if (bgnHidden) bgnHidden.value = '113/01/01';
            if (endHidden) endHidden.value = '115/12/31';

            // 關鍵：不勾選已結束課程！
            const queryHistory = document.getElementById('queryHistory');
            if (queryHistory) queryHistory.checked = false;
        });
        console.log('   ✅ 日期: 113/01/01 - 115/12/31');
        console.log('   ✅ 已結束課程: 未勾選');

        // Step 3: 點擊查詢
        console.log('\n3️⃣ 執行查詢...');
        await page.click('button');

        // 等待 AJAX 載入
        await page.waitForTimeout(3000);

        // Step 4: 檢查結果
        console.log('\n4️⃣ 檢查結果...');
        const result = await page.evaluate(() => {
            const table = document.getElementById('clslist_tb');
            if (!table) return { found: false, message: 'Table not found' };

            const tbody = table.querySelector('tbody');
            const rows = tbody ? tbody.querySelectorAll('tr') : [];

            // 分類行：學校標題行 vs 課程資料行
            const schoolRows = [];
            const courseRows = [];

            Array.from(rows).forEach((row, idx) => {
                const cells = row.querySelectorAll('td');
                const text = row.innerText.trim();

                // 跳過「查無資料」
                if (text.includes('查無資料')) return;

                // 學校標題行：只有一個 td 且包含「新北市」
                if (cells.length === 1 && text.includes('新北市')) {
                    schoolRows.push({
                        index: idx,
                        text: text.substring(0, 200)
                    });
                }
                // 課程資料行：有 7 個 td
                else if (cells.length === 7) {
                    courseRows.push({
                        index: idx,
                        cells: Array.from(cells).map((cell, i) => ({
                            index: i,
                            html: cell.innerHTML.substring(0, 500),
                            text: cell.innerText.trim().replace(/\s+/g, ' ').substring(0, 200)
                        }))
                    });
                }
            });

            return {
                found: true,
                totalRows: rows.length,
                schoolRows,
                courseRows: courseRows.slice(0, 3), // 只取前三行
                tableHtml: table.outerHTML.substring(0, 15000)
            };
        });

        console.log(`   📊 總行數: ${result.totalRows}`);
        console.log(`   🏫 學校標題: ${result.schoolRows?.length || 0}`);
        console.log(`   📚 課程資料: ${result.courseRows?.length || 0}`);

        if (result.schoolRows?.length > 0) {
            console.log('\n   🏫 學校列表:');
            result.schoolRows.forEach(r => console.log(`      - ${r.text}`));
        }

        if (result.courseRows?.length > 0) {
            console.log('\n   📋 課程資料預覽:');
            result.courseRows.forEach((row, i) => {
                console.log(`\n   --- 課程 ${i + 1} ---`);
                row.cells.forEach(cell => {
                    const labels = ['序號', '課程名稱', '日期時段', '費用', '報名資格', '錄取名額', '狀態'];
                    console.log(`      ${labels[cell.index]}: ${cell.text}`);
                });
            });

            // 保存資料
            writeFileSync('data/sample-courses.json', JSON.stringify(result.courseRows, null, 2));
            writeFileSync('data/table.html', result.tableHtml);
            console.log('\n   ✅ 已保存樣本資料');
        } else {
            console.log('\n   ⚠️ 沒有找到課程資料');
            const fullHtml = await page.content();
            writeFileSync('data/page.html', fullHtml);
        }

        // Step 5: 截圖
        console.log('\n5️⃣ 保存截圖...');
        await page.screenshot({
            path: 'data/screenshot.png',
            fullPage: true
        });
        console.log('   ✅ 截圖已保存');

        console.log('\n✅ Phase 1 測試完成!');
        return result;

    } catch (error) {
        console.error('❌ 錯誤:', error.message);
        await page.screenshot({ path: 'data/error-screenshot.png' }).catch(() => { });
    } finally {
        await browser.close();
    }
}

// 確保 data 資料夾存在
try { mkdirSync('data', { recursive: true }); } catch { }

testPlaywrightCrawl().catch(console.error);
