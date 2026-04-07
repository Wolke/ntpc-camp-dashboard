/**
 * Phase 1: API 存取測試腳本
 * 驗證是否可以直接透過 HTTP 請求取得資料
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://camp.ntpc.edu.tw/jsp/act_register/ACTMangAction.do';

async function testApiAccess() {
    console.log('🚀 Phase 1: 測試 API 存取\n');

    // Step 1: 先訪問首頁取得 Session
    console.log('1️⃣ 取得 Session Cookie...');
    const sessionResponse = await axios.get(
        `${BASE_URL}?method=ActMang_OutIndex&schno=all`,
        {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
        }
    );

    // 取得 cookies
    const cookies = sessionResponse.headers['set-cookie'];
    const cookieString = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';
    console.log(`   ✅ Cookie: ${cookieString.substring(0, 50)}...`);

    // Step 2: 發送 POST 請求取得資料
    console.log('\n2️⃣ 發送 POST 請求取得課程資料...');

    // 使用更寬的日期範圍來確保有資料
    const params = new URLSearchParams({
        method: 'ActMang_OutIndex',
        status: 'outindex_chgpage',
        queryActive: 'true',
        findsch: 'all',
        subarea: '25',          // 板橋區，通常有更多課程
        bgndate: '110/01/01',   // 民國110年 (2021)
        enddate: '116/12/31',   // 民國116年 (2027)
        queryHistory: 'true',   // 包含歷史課程
        shownum: '20',
        nowpage: '1',
        overage: 'all',
        keyword: ''
    });

    const dataResponse = await axios.post(BASE_URL, params.toString(), {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookieString,
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Referer': `${BASE_URL}?method=ActMang_OutIndex&schno=all`
        }
    });

    console.log(`   ✅ 回應狀態: ${dataResponse.status}`);
    console.log(`   📦 回應長度: ${dataResponse.data.length} bytes`);

    // Step 3: 解析 HTML
    console.log('\n3️⃣ 解析 HTML 回應...');
    const $ = cheerio.load(dataResponse.data);

    // 檢查是否有資料表格
    const tables = $('table');
    console.log(`   📊 找到 ${tables.length} 個表格`);

    // 嘗試找課程列
    const rows = $('tr').filter((i, el) => {
        const text = $(el).text();
        return text.includes('報名') || text.includes('課程');
    });
    console.log(`   📋 找到 ${rows.length} 個相關行`);

    // 輸出前幾行的原始內容以供分析
    console.log('\n4️⃣ 範例資料 (前 3 行):');
    $('tr').slice(0, 5).each((i, row) => {
        const text = $(row).text().replace(/\s+/g, ' ').trim().substring(0, 200);
        console.log(`   Row ${i}: ${text}...`);
    });

    // 檢查是否有「查無資料」
    if (dataResponse.data.includes('查無資料')) {
        console.log('\n⚠️ 注意: 回應包含「查無資料」，可能需要調整查詢參數');
    }

    // 輸出原始 HTML 片段以供分析
    console.log('\n5️⃣ 原始 HTML 片段 (前 2000 字元):');
    console.log(dataResponse.data.substring(0, 2000));

    console.log('\n✅ Phase 1 測試完成!');
}

// 執行測試
testApiAccess().catch(err => {
    console.error('❌ 錯誤:', err.message);
    if (err.response) {
        console.error('   回應狀態:', err.response.status);
        console.error('   回應內容:', err.response.data?.substring?.(0, 500));
    }
    process.exit(1);
});
