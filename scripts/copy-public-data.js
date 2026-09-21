import { copyFileSync, mkdirSync, rmSync } from 'node:fs';

// Only published course data belongs in Pages. Never copy subscriber lists or delivery state.
const target = 'dist/data';
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
for (const name of ['courses.json', 'external-courses.json', 'taipei-courses.json', 'unindexed-activities.json']) {
    copyFileSync(`data/${name}`, `${target}/${name}`);
}
