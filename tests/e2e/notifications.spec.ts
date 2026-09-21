import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { makeCourse } from '../../src/test/courseFactory';

for (const width of [1280, 390, 320]) {
    test(`custom notification conditions remain readable at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        const base = makeCourse();
        const course = makeCourse({
            category: '足球營',
            schedule: { ...base.schedule, startDate: '2099-09-28', endDate: '2099-10-05', weekday: '週一' },
        });
        await page.route('**/data/courses.json', (route) => route.fulfill({ json: {
            lastUpdated: new Date().toISOString(),
            courses: [course],
            stats: { total: 1, schools: 1, allowExternalStudents: 1, free: 1, canRegister: 1 },
        } }));
        await page.goto('./?q=足球&grades=3&weekdays=%E9%80%B1%E4%B8%80&eligibility=external');
        await page.getByRole('link', { name: '訂閱這組條件' }).click();
        const panel = page.getByRole('region', { name: '客製化 email 通知' });
        await expect(panel).toBeVisible();
        await expect(panel.getByLabel('通知頻率')).toHaveValue('weekly');
        await expect(panel.getByText('關鍵字：足球')).toBeVisible();
        await expect(panel.getByText('上課星期：週一')).toBeVisible();
        await expect(panel.getByText(/目前符合 1 門/)).toBeVisible();
        await panel.getByText('預覽符合課程').click();
        await expect(panel.getByText(/足球營 ·/)).toBeVisible();
        await panel.getByLabel('通知頻率').selectOption('both');
        await expect(panel.getByText(/每日提醒只列出當天開放報名/)).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
        const audit = await new AxeBuilder({ page }).include('#email-subscription').analyze();
        expect(audit.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact || ''))).toEqual([]);
        await panel.screenshot({ path: `/tmp/ntpc-email-notifications-${width}.png` });
    });
}
