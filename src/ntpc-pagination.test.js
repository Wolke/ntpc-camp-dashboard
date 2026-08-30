import { describe, expect, it } from 'vitest';
import { markNextPageControl } from './ntpc-pagination.js';

describe('NTPC pagination', () => {
    it('finds the next page when the official site renders page controls as buttons', () => {
        document.body.innerHTML = `
            <div class="pagination">
                <button class="pg_act" onclick="subPage('now', '1')" aria-label="第1頁">1</button>
                <button class="pg_dis" onclick="subPage('now', '2')" aria-label="第2頁">2</button>
                <button class="pg_dis" onclick="subPage('now', '3')" aria-label="第3頁">3</button>
            </div>
        `;

        expect(markNextPageControl()).toEqual({
            hasNextPage: true,
            currentPage: 1,
            targetPage: 2,
            nextBtnSelector: '[data-crawler-next-page="true"]',
        });
        expect(document.querySelector('[data-crawler-next-page="true"]')?.textContent).toBe('2');
    });

    it('stops on the final page and supports the official next-page-group control', () => {
        document.body.innerHTML = `
            <div class="pagination">
                <button class="pg_act" onclick="subPage('now', '10')" aria-label="第10頁">10</button>
                <button onclick="subPage('down', '11')" aria-label="第11頁">下一頁</button>
            </div>
        `;
        expect(markNextPageControl()).toMatchObject({ hasNextPage: true, currentPage: 10, targetPage: 11 });

        document.body.innerHTML = `
            <div class="pagination">
                <button class="pg_act" onclick="subPage('now', '3')" aria-label="第3頁">3</button>
            </div>
        `;
        expect(markNextPageControl()).toEqual({
            hasNextPage: false,
            currentPage: 3,
            targetPage: null,
            nextBtnSelector: null,
        });
    });
});
