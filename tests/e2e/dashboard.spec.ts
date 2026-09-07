import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('desktop prioritizes results, pagination, sorting and official links', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('./');

    await expect(page.getByRole('heading', { name: '課程查詢' })).toBeVisible();
    await expect(page.getByText('預設顯示尚未結束的課程')).toBeVisible();
    await expect(page.getByRole('heading', { name: '依行政區或學校尋找' })).not.toBeVisible();

    const cards = page.locator('main article');
    await expect(cards).toHaveCount(24);
    const firstTitle = cards.first().getByRole('heading');
    await expect(firstTitle).toBeVisible();
    expect((await firstTitle.boundingBox())?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(900);
    await expect(page.getByRole('combobox', { name: '排序方式' })).toHaveValue('actionable');
    await expect(page.getByRole('button', { name: '📅 即將開課' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: '▶️ 進行中' })).toHaveAttribute('aria-pressed', 'true');

    const officialLink = cards.first().getByRole('link', { name: /查看官方/ }).first();
    await expect(officialLink).toHaveAttribute('target', '_blank');
    await expect(officialLink).toHaveAttribute('href', /^https:\/\//);

    await page.getByRole('button', { name: /載入更多/ }).click();
    await expect(cards).toHaveCount(48);
    await page.getByRole('combobox', { name: '排序方式' }).selectOption('course-date-asc');
    await expect(cards).toHaveCount(24);
});

test('school finder filters by district and restores a shared school URL', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('./');

    await page.getByRole('button', { name: /用地圖找學校/ }).click();
    await expect(page.getByRole('heading', { name: '依行政區或學校尋找' })).toBeVisible();
    await page.getByRole('button', { name: /^中和區/ }).click();
    await page.getByRole('searchbox', { name: '搜尋學校' }).fill('光復國小');
    const schoolList = page.getByRole('region', { name: '學校清單' });
    await schoolList.getByRole('button', { name: /新北市中和區光復國民小學/ }).click();

    await expect(page.getByRole('heading', { name: '依行政區或學校尋找' })).not.toBeVisible();
    await expect(page.locator('main article').first()).toContainText('新北市中和區光復國民小學');
    await expect(page.getByRole('button', { name: /移除篩選：學校：新北市中和區光復國民小學/ })).toBeVisible();
    expect(page.url()).toContain('district=');
    expect(page.url()).toContain('school=');

    await page.reload();
    await expect(page.locator('main article').first()).toContainText('新北市中和區光復國民小學');
});

test('390px shows a result in the first viewport and applies drawer changes on confirmation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./');

    const firstTitle = page.locator('main article').first().getByRole('heading');
    await expect(firstTitle).toBeVisible();
    expect((await firstTitle.boundingBox())?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(844);

    const filterButton = page.getByRole('button', { name: /篩選課程/ });
    await expect(filterButton).toContainText('未套用條件');
    await filterButton.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: '篩選課程' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: '小三', exact: true }).click();
    await expect(page.locator('main article').first().getByRole('heading')).toHaveText(await firstTitle.innerText());
    await dialog.getByRole('button', { name: /查看 \d+ 門課程/ }).click();
    await expect(page.getByRole('button', { name: /移除篩選：小三/ })).toBeVisible();
    await expect(page).toHaveURL(/grades=3/);

    await filterButton.click();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(filterButton).toBeFocused();
});

test('URL state restores structured filters and non-private sorting', async ({ page }) => {
    await page.goto('./?q=%E7%B1%83%E7%90%83&grades=3&eligibility=external&fee=free&sort=fee-asc');
    await expect(page.getByRole('textbox', { name: '搜尋課程' })).toHaveValue('籃球');
    await expect(page.getByRole('button', { name: '開放外校', exact: true }).first()).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('combobox', { name: '排序方式' })).toHaveValue('fee-asc');
    await page.reload();
    await expect(page.getByRole('textbox', { name: '搜尋課程' })).toHaveValue('籃球');
    await expect(page.getByRole('combobox', { name: '排序方式' })).toHaveValue('fee-asc');
});

test('distance sorting stays unchanged when location is denied', async ({ page, context }) => {
    await context.clearPermissions();
    await page.goto('./');
    const sort = page.getByRole('combobox', { name: '排序方式' });
    await sort.selectOption('distance');
    await expect(sort).toHaveValue('actionable');
    await expect(page.getByRole('status')).toContainText(/無法取得位置|不支援定位/);
});

test('320px navigation stays on one line and has no serious axe violations', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto('./');
    await expect(page.getByRole('navigation', { name: '主要導覽' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact || ''))).toEqual([]);
});

test('analysis links representatives to official details and advisor starts blank', async ({ page }) => {
    await page.goto('./analysis');
    await expect(page.getByRole('link', { name: /官方詳情（另開新分頁）/ }).first()).toHaveAttribute('target', '_blank');
    await page.goto('./advisor');
    await expect(page.getByRole('combobox', { name: '年級' })).toHaveValue('');
    await expect(page.getByText('選擇孩子目前的年級後，才會產生符合資格的課程建議。')).toBeVisible();
});

test('school-page-only courses retain provenance, eligibility and official links', async ({ page }) => {
    await page.goto('./');
    await page.getByRole('textbox', { name: '搜尋課程' }).fill('樂利國小');
    await page.getByRole('button', { name: /用地圖找學校/ }).click();
    await expect(page.getByText('找到 1 所學校')).toBeVisible();
    const firstCard = page.locator('main article').first();
    await expect(firstCard).toContainText('新北市土城區樂利國民小學');
    await expect(firstCard).toContainText('限本校');
    await firstCard.getByText('更多資訊與工具').click();
    await expect(firstCard).toContainText('學校另行公開（Camp 全站未收錄）');
    await expect(firstCard.getByRole('link', { name: /查看官方/ })).toHaveAttribute('href', /schno=014773&actmang_no=00038/);
});
