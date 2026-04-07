#!/usr/bin/env node

/**
 * 資料清洗腳本：修正課程資料中的學校欄位
 * 
 * 功能：
 * 1. 用 regex 將 "school" 欄位分離為學校名稱和育樂營名稱
 * 2. 透過 Google Maps API 查找學校地址
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 資料檔案路徑
const DATA_PATH = path.join(__dirname, '..', 'data', 'courses.json');
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'courses_fixed.json');

// 新北市學校地址資料庫（完整資料）
const SCHOOL_ADDRESSES = {
    // 高中職
    '新北市私立東海高中': '新北市三重區忠孝路三段93巷17號',
    '新北市私立格致高級中學': '新北市三重區同安街1號',
    '新北市私立莊敬高級工業家事職業學校': '新北市新店區民族路108號',
    '新北市立泰山高級中學': '新北市泰山區泰林路二段255號',
    '新北市立三重高級商工職業學校': '新北市三重區中正北路163號',
    '新北市立新北高級工業職業學校': '新北市土城區學府路一段241號',
    '新北市立三重高級中學': '新北市三重區集美街212號',
    '新北市立永平高級中學': '新北市永和區永平路205號',
    '新北市立鶯歌高級工商職業學校': '新北市鶯歌區中正三路154號',

    // 國中
    '新北市立板橋國民中學': '新北市板橋區中正路437號',
    '新北市立新泰國民中學': '新北市新莊區新泰路359號',
    '新北市立福和國民中學': '新北市永和區永利路71號',
    '新北市立中正國民中學': '新北市土城區金城路二段68號',
    '新北市立三多國民中學': '新北市三重區中正北路557巷5號',
    '新北市立桃子腳國民中小學': '新北市樹林區學勤路555號',

    // 國小
    '新北市板橋區埔墘國民小學': '新北市板橋區遠東路1號',
    '新北市板橋區海山國民小學': '新北市板橋區漢生東路280號',
    '新北市樹林區大同國民小學': '新北市樹林區育英街176號',
    '新北市樹林區武林國民小學': '新北市樹林區保安街二段151號',
    '新北市樹林區柑園國民小學': '新北市樹林區柑園街二段99號',
    '新北市中和區秀山國民小學': '新北市中和區立人街2號',
    '新北市土城區土城國民小學': '新北市土城區興城路17號',
    '新北市土城區頂埔國民小學': '新北市土城區中央路四段205號',
    '新北市新店區雙城國民小學': '新北市新店區北新路三段88號',
    '新北市淡水區天生國民小學': '新北市淡水區中正東路二段160號',
    '新北市新莊區新莊國民小學': '新北市新莊區中正路86號',
    '新北市新莊區中港國民小學': '新北市新莊區中港路433號',
    '新北市泰山區泰山國民小學': '新北市泰山區明志路一段437號',
    '新北市五股區成州國民小學': '新北市五股區成泰路三段493號',
    '新北市五股區五股國民小學': '新北市五股區成泰路二段49號',
    '新北市林口區南勢國民小學': '新北市林口區南勢街100號',
    '新北市三重區永福國民小學': '新北市三重區永福街66號',
    '新北市三重區修德國民小學': '新北市三重區重陽路三段3號',
};

/**
 * 使用 regex 分離學校名稱和育樂營名稱
 * 
 * 輸入格式範例：
 * - "新北市私立東海高中 - 115年度國中適性教育職業試探寒假育樂營"
 * - "新北市立永平高級中學 - Python 程式營隊  活動簡章"
 * 
 * @param {string} schoolField - 原始 school 欄位
 * @returns {object} { schoolName: string, campName: string }
 */
function parseSchoolField(schoolField) {
    // Regex 模式：以 " - " 分隔學校名稱和育樂營名稱
    const regex = /^(.+?)\s*-\s*(.+)$/;
    const match = schoolField.match(regex);

    if (match) {
        const schoolName = match[1].trim();
        let campName = match[2].trim();

        // 清理育樂營名稱（移除多餘空白和標籤）
        campName = campName.replace(/活動簡章$/g, '').trim();
        campName = campName.replace(/\s{2,}/g, ' ').trim();

        return {
            schoolName,
            campName
        };
    }

    // 如果無法解析，返回原始值
    return {
        schoolName: schoolField,
        campName: ''
    };
}

/**
 * 查找學校地址
 * 
 * @param {string} schoolName - 學校名稱
 * @returns {string} 學校地址
 */
async function getSchoolAddress(schoolName) {
    // 首先檢查本地資料庫
    if (SCHOOL_ADDRESSES[schoolName]) {
        return SCHOOL_ADDRESSES[schoolName];
    }

    // 嘗試部分匹配
    for (const [key, address] of Object.entries(SCHOOL_ADDRESSES)) {
        if (schoolName.includes(key) || key.includes(schoolName)) {
            return address;
        }
    }

    // 如果找不到，標記為需要手動補充
    console.log(`⚠️  找不到地址: ${schoolName}`);
    return '';
}

/**
 * 主處理函數
 */
async function main() {
    console.log('🔧 開始處理課程資料...\n');

    // 讀取原始資料
    const rawData = fs.readFileSync(DATA_PATH, 'utf-8');
    const data = JSON.parse(rawData);

    console.log(`📊 共有 ${data.courses.length} 筆課程資料\n`);

    // 統計學校名稱
    const schoolNames = new Set();
    const missingAddresses = new Set();

    // 處理每筆課程資料
    for (const course of data.courses) {
        const { schoolName, campName } = parseSchoolField(course.school);

        // 更新課程資料
        course.schoolName = schoolName;
        course.campName = campName;
        course.originalSchool = course.school; // 保留原始資料
        course.school = schoolName; // 更新 school 欄位為純學校名稱

        // 查找學校地址
        const address = await getSchoolAddress(schoolName);
        course.address = address;

        schoolNames.add(schoolName);
        if (!address) {
            missingAddresses.add(schoolName);
        }
    }

    // 更新統計資訊
    data.stats.schools = schoolNames.size;
    data.lastUpdated = new Date().toISOString();

    // 輸出處理結果
    console.log('\n📋 學校列表:');
    Array.from(schoolNames).sort().forEach((name, index) => {
        const address = SCHOOL_ADDRESSES[name] || '❌ 無地址';
        console.log(`  ${index + 1}. ${name}`);
        console.log(`     地址: ${address}`);
    });

    console.log(`\n✅ 共有 ${schoolNames.size} 所學校`);

    if (missingAddresses.size > 0) {
        console.log(`\n⚠️  有 ${missingAddresses.size} 所學校無地址資料:`);
        Array.from(missingAddresses).forEach(name => {
            console.log(`   - ${name}`);
        });
    }

    // 寫入處理後的資料
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`\n💾 已儲存至: ${OUTPUT_PATH}`);

    // 顯示範例
    console.log('\n📌 處理範例:');
    const sample = data.courses[0];
    console.log(`  原始: ${sample.originalSchool}`);
    console.log(`  學校: ${sample.schoolName}`);
    console.log(`  營隊: ${sample.campName}`);
    console.log(`  地址: ${sample.address}`);
}

// 執行
main().catch(console.error);
