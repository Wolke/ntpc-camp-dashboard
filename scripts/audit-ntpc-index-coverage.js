/**
 * Audit NTPC's public school activity pages against the Camp global index.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { discoverUnindexedSchoolActivities } from '../src/ntpc-school-activity-crawler.js';

function parseArgs(argv) {
    const args = { data: 'data/courses.json', output: '', summary: false };

    for (let index = 0; index < argv.length; index += 1) {
        if (argv[index] === '--data' && argv[index + 1]) {
            args.data = argv[index + 1];
            index += 1;
        } else if (argv[index] === '--output' && argv[index + 1]) {
            args.output = argv[index + 1];
            index += 1;
        } else if (argv[index] === '--summary') {
            args.summary = true;
        }
    }

    return args;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const courseData = JSON.parse(await readFile(args.data, 'utf8'));
    const { report } = await discoverUnindexedSchoolActivities(courseData.courses ?? []);
    report.sourceDataUpdatedAt = courseData.lastUpdated ?? null;

    if (args.output) {
        await writeFile(args.output, `${JSON.stringify(report, null, 2)}\n`);
    }

    if (args.summary) {
        console.log([
            `檢查學校／單位：${report.summary.schoolsChecked}`,
            `各校公開進行中活動：${report.summary.publicActiveActivities}`,
            `Camp 全站已索引：${report.summary.indexedActivities}`,
            `未索引：${report.summary.missingActivities} 個活動、${report.summary.missingSchools} 所學校、${report.summary.missingCourses} 門課`,
            `未索引且正在報名：${report.summary.openMissingActivities}`,
            `未索引且尚未開放：${report.summary.upcomingMissingActivities}`,
            `未索引且開放外校：${report.summary.externalMissingActivities} 個活動、${report.summary.externalMissingSchools} 所學校、${report.summary.externalMissingCourses} 門課`,
            `讀取失敗：${report.summary.failedSchools} 所學校、${report.summary.failedActivities} 個活動`
        ].join('\n'));
    } else {
        console.log(JSON.stringify(report, null, 2));
    }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

