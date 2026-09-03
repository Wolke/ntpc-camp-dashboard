import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('desktop sidebar, pagination, sorting and official link work', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('./');

    await expect(page.getByRole('heading', { name: '課程查詢' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '課程日期' })).toBeVisible();
    await expect(page.locator('aside').getByLabel('開始日期')).toHaveValue('');

    const sidebarOverflow = await page.locator('aside').evaluate((element) => getComputedStyle(element).overflowY);
    expect(sidebarOverflow).not.toMatch(/auto|scroll/);

    const cards = page.locator('main article');
    await expect(cards).toHaveCount(24);
    await expect(page.getByRole('button', { name: '即將開課', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: '📅 即將開課' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTitle('新北市土城區土城國民小學，23 門課程')).toBeVisible();
    const officialLink = cards.first().getByRole('link', { name: '查看官方詳情' });
    await expect(officialLink).toHaveAttribute('target', '_blank');
    await expect(officialLink).toHaveAttribute(
        'href',
        /(?:ACTClsAction\.do\?.*status=index_detail_outquery|ACTOutIndexAction\.do\?.*method=ACTOutIndex_ClsList)/,
    );

    await page.getByRole('button', { name: /載入更多/ }).click();
    await expect(cards).toHaveCount(48);
    await page.getByRole('button', { name: '課程近' }).click();
    await expect(cards).toHaveCount(24);

    await page.getByRole('textbox', { name: '搜尋課程' }).fill('福和國中');
    const prospectusLink = cards.first().getByRole('link', { name: '活動簡章' });
    await expect(prospectusLink).toHaveAttribute('href', /\/central\/db2admin\/uploadfile\/ntpc_actregister\/public\//);
});

test('390px drawer applies only on confirmation, supports Escape and resets empty results', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./');

    const firstCard = page.locator('main article').first();
    await expect(firstCard).toBeVisible();
    const box = await firstCard.boundingBox();
    expect(box?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(844 * 2);

    const filterButton = page.getByRole('button', { name: /篩選課程/ });
    await filterButton.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: '篩選課程' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: '篩選課程' })).not.toBeVisible();
    await expect(filterButton).toBeFocused();

    await page.getByRole('textbox', { name: '搜尋課程' }).fill('福和國中');
    await expect(page.locator('main article')).toHaveCount(9);
    await filterButton.click();
    const dialog = page.getByRole('dialog', { name: '篩選課程' });
    await dialog.getByRole('button', { name: '限本校', exact: true }).click();
    await expect(page.locator('main article')).toHaveCount(9);
    await dialog.getByRole('button', { name: /查看 0 門課程/ }).click();
    await expect(page.getByText('沒有符合條件的課程')).toBeVisible();
    await page.getByRole('button', { name: '清除所有條件' }).click();
    await expect(page.locator('main article')).toHaveCount(24);
});

test('320px navigation stays on one line and has no serious axe violations', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto('./');

    await expect(page.getByRole('navigation', { name: '主要導覽' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);

    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact || ''));
    expect(serious).toEqual([]);
});

test('analysis links representatives to official details and advisor starts blank', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('./analysis');

    const representativeLink = page.getByRole('link', { name: /官方詳情（另開新分頁）/ }).first();
    await expect(representativeLink).toHaveAttribute('href', /^https:\/\//);
    await expect(representativeLink).toHaveAttribute('target', '_blank');

    await page.goto('./advisor');
    await expect(page.getByRole('combobox', { name: '年級' })).toHaveValue('');
    await expect(page.getByText('選擇孩子目前的年級後，才會產生符合資格的課程建議。')).toBeVisible();
    await expect(page.getByText(/目前條件沒有找到合適課程/)).not.toBeVisible();
});

test('school-page-only courses are searchable with provenance and eligibility', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('./');

    const search = page.getByRole('textbox', { name: '搜尋課程' });
    await search.fill('樂利國小');
    let firstCard = page.locator('main article').first();

    await expect(firstCard).toContainText('新北市土城區樂利國民小學');
    await expect(firstCard).toContainText('限本校');
    await expect(firstCard).toContainText('逐校公開・全站未索引');
    await expect(firstCard.getByRole('link', { name: '查看官方詳情' })).toHaveAttribute(
        'href',
        /schno=014773&actmang_no=00038/,
    );

    await search.fill('光復國小');
    firstCard = page.locator('main article').first();

    await expect(firstCard).toContainText('新北市中和區光復國民小學');
    await expect(firstCard).toContainText('開放外校');
    await expect(firstCard).toContainText('逐校公開・全站未索引');
    await expect(firstCard).toContainText('限制本縣市學生');
    await expect(firstCard.getByRole('link', { name: '查看官方詳情' })).toHaveAttribute(
        'href',
        /schno=014796&actmang_no=00056/,
    );
});
