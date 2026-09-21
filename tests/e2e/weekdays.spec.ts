import { expect, test } from '@playwright/test';
import { makeCourse } from '../../src/test/courseFactory';
import type { Course } from '../../src/types/course';

test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-09-01T12:00:00+08:00'));
    const courses = [
        makeCourse({
            category: '週一與週三課程',
            schedule: { weekday: '週一' } as Course['schedule'],
            _raw: { schedule: '週一 09:00~12:00\n週三 09:00~12:00' },
        }),
        makeCourse({ category: '週四課程' }),
        makeCourse({ category: '週日課程', schedule: { weekday: '週日' } as Course['schedule'] }),
    ];
    await page.route('**/data/courses.json', (route) => route.fulfill({
        json: {
            lastUpdated: '2026-09-01T00:00:00+08:00',
            stats: { total: 3, schools: 1, free: 3, allowExternalStudents: 3, canRegister: 3 },
            courses,
        },
    }));
});

test('desktop weekday selections filter results, survive reload and can be cleared', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('./');
    const weekdays = page.getByRole('region', { name: '上課星期' });
    const cards = page.locator('main article');
    await expect(cards).toHaveCount(3);
    await expect(weekdays.getByRole('button')).toHaveCount(8);

    await weekdays.getByRole('button', { name: '週三', exact: true }).click();
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText('週一與週三課程');
    await weekdays.getByRole('button', { name: '週日', exact: true }).click();
    await expect(cards).toHaveCount(2);
    await expect(page).toHaveURL(/weekdays=/);

    await page.reload();
    await expect(weekdays.getByRole('button', { name: '週三', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(weekdays.getByRole('button', { name: '週日', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(cards).toHaveCount(2);
    await page.getByRole('button', { name: '移除篩選：上課星期：週三、週日', exact: true }).click();
    await expect(cards).toHaveCount(3);
    await expect(weekdays.getByRole('button', { name: '不限', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page).not.toHaveURL(/weekdays=/);
});

test('mobile weekday drafts preview results and apply only after confirmation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./');
    const filterButton = page.getByRole('button', { name: /篩選課程/ });
    const dialog = page.getByRole('dialog', { name: '篩選課程' });
    const weekdays = dialog.getByRole('region', { name: '上課星期' });
    const cards = page.locator('main article');
    await expect(cards).toHaveCount(3);
    await filterButton.click();
    await weekdays.getByRole('button', { name: '週日', exact: true }).click();
    await expect(dialog.getByRole('button', { name: '查看 1 門課程', exact: true })).toBeVisible();
    await expect(cards).toHaveCount(3);
    await page.keyboard.press('Escape');
    await expect(page).not.toHaveURL(/weekdays=/);

    await filterButton.click();
    await expect(weekdays.getByRole('button', { name: '不限', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await weekdays.getByRole('button', { name: '週日', exact: true }).click();
    await dialog.getByRole('button', { name: '查看 1 門課程', exact: true }).click();
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText('週日課程');
    await expect(filterButton).toContainText('1 組條件');

    await filterButton.click();
    await weekdays.getByRole('button', { name: '不限', exact: true }).click();
    await dialog.getByRole('button', { name: '查看 3 門課程', exact: true }).click();
    await expect(cards).toHaveCount(3);
    await expect(filterButton).toContainText('未套用條件');
    await expect(page).not.toHaveURL(/weekdays=/);
});
