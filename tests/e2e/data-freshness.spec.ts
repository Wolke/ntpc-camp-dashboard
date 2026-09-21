import { expect, test } from '@playwright/test';
import { makeCourse } from '../../src/test/courseFactory';

test('fresh NTPC data still displays the original date of an unavailable Taipei source', async ({ page }) => {
    const lastUpdated = new Date().toISOString();
    await page.route('**/data/courses.json', async (route) => route.fulfill({
        json: {
            lastUpdated,
            stats: { total: 1, schools: 1, free: 1, allowExternalStudents: 1, canRegister: 1 },
            courses: [makeCourse()],
            sourceStatus: [
                { type: 'ntpc_camp', name: '新北市寒暑假育樂營', status: 'updated', lastUpdated, courseCount: 1 },
                { type: 'taipei_holiday', name: '臺北市國民小學暑期體驗營', status: 'cached', lastUpdated: '2026-09-08T02:13:33Z', courseCount: 0 },
            ],
        },
    }));
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('./');
    await expect(page.getByText('共 1 門課程，1 個學校／單位', { exact: false })).toBeVisible();
    await expect(page.getByText(/部分來源未更新：/)).toBeVisible();
    const warning = page.getByText(/臺北市國民小學暑期體驗營：暫時無法更新/);
    await expect(warning).toContainText('2026/9/8');
    await expect(warning).toContainText('0 門課程');
    await expect(page.getByText('資料已超過 8 天未更新，內容可能不是最新狀態。')).not.toBeVisible();

    await page.setViewportSize({ width: 320, height: 720 });
    await expect(warning).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
