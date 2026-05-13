import { mkdirSync, writeFileSync } from 'fs';
import { crawlTaipeiCamps } from '../src/taipei-crawler.js';

const output = await crawlTaipeiCamps();

mkdirSync('data', { recursive: true });
writeFileSync('data/taipei-courses.json', JSON.stringify(output, null, 2));

console.log(`臺北市暑期體驗營：${output.stats.total} 筆梯次課程，${output.stats.schools} 個學校`);
console.log('已保存至 data/taipei-courses.json');
