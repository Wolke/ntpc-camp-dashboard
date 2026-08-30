export function markNextPageControl(root = document) {
    const markerAttribute = 'data-crawler-next-page';
    root.querySelectorAll(`[${markerAttribute}]`).forEach((element) => element.removeAttribute(markerAttribute));

    const currentPageElement = root.querySelector('.pagination .pg_act');
    const currentPage = Number.parseInt(currentPageElement?.textContent?.trim() || '', 10);
    if (!Number.isFinite(currentPage)) {
        return { hasNextPage: false, currentPage: null, targetPage: null, nextBtnSelector: null };
    }

    const controls = Array.from(root.querySelectorAll('.pagination [onclick*="subPage"]'));
    const expectedNextPage = currentPage + 1;
    let nextControl = controls.find((element) =>
        element.getAttribute('aria-label') === `第${expectedNextPage}頁`
        || element.textContent?.trim() === String(expectedNextPage));

    if (!nextControl) {
        nextControl = controls.find((element) =>
            /subPage\(\s*['"]down['"]/.test(element.getAttribute('onclick') || ''));
    }

    if (!nextControl) {
        return { hasNextPage: false, currentPage, targetPage: null, nextBtnSelector: null };
    }

    nextControl.setAttribute(markerAttribute, 'true');
    const ariaPage = nextControl.getAttribute('aria-label')?.match(/第(\d+)頁/)?.[1];
    const onclickPage = nextControl.getAttribute('onclick')?.match(/subPage\([^,]+,\s*['"]?(\d+)/)?.[1];
    const targetPage = Number.parseInt(ariaPage || onclickPage || String(expectedNextPage), 10);

    return {
        hasNextPage: true,
        currentPage,
        targetPage,
        nextBtnSelector: `[${markerAttribute}="true"]`,
    };
}
