#!/usr/bin/env node
// engager.js — 2단계: 좋아요 (베지에 마우스 + Jitter 딜레이)
const { jitter, sleep, humanDelay, humanClick } = require('./stealth_utils');
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

async function waitForGQL(page, timeout = 8000) {
  return new Promise(resolve => {
    const handler = async (response) => {
      if (response.url().includes('/graphql') && response.request().method() === 'POST') {
        try {
          const body = await response.text();
          if (/like_count|has_liked/i.test(body)) {
            page.off('response', handler);
            resolve({ status: response.status() });
          }
        } catch {}
      }
    };
    page.on('response', handler);
    setTimeout(() => { page.off('response', handler); resolve(null); }, timeout);
  });
}

async function engage(page, candidates, { maxLikes = 10 } = {}) {
  const results = [];
  const processedIds = new Set();
  const maxScrollRounds = 12;

  console.log(`❤️ 좋아요 시작 (목표: ${maxLikes}개, 최대 ${maxScrollRounds}라운드 스크롤)`);

  for (let round = 0; round < maxScrollRounds && results.length < maxLikes; round++) {
    const feedPosts = page.locator('[data-pressable-container]');
    const feedCount = await feedPosts.count().catch(() => 0);
    if (feedCount === 0) break;

    for (let i = 0; i < Math.min(6, feedCount) && results.length < maxLikes; i++) {
      try {
        const fp = feedPosts.nth(i);
        if (!(await fp.isVisible({ timeout: 500 }).catch(() => false))) continue;

        const likeSvg = fp.locator('svg[aria-label="좋아요"]').first();
        const unlikeSvg = fp.locator('svg[aria-label="좋아요 취소"]').first();

        if (await unlikeSvg.isVisible({ timeout: 300 }).catch(() => false)) continue;
        if (!(await likeSvg.isVisible({ timeout: 800 }).catch(() => false))) continue;
        if (Math.random() > 0.95) continue;

        const gql = waitForGQL(page);
        await humanClick(page, likeSvg);
        const result = await gql;

        if (result) {
          // 작성자 추출
          let author = 'unknown';
          try {
            const authorEl = fp.locator('a[href^="/@"]').first();
            const authorHref = await authorEl.getAttribute('href').catch(() => '');
            author = (authorHref || '').replace('/@', '').replace(/^\/$/, '') || 'unknown';
          } catch {}

          results.push({ author, postId: '', graphql: `${result.status}` });
          console.log(`   ❤️ #${results.length} → @${author} [GQL:${result.status}]`);
        }

        await sleep(rand(5000, 12000));
        // 20% 확률로 긴 휴식
        if (Math.random() < 0.2) await sleep(rand(15000, 25000));
      } catch {}
    }

    // 스크롤해서 새 글 로드
    await page.evaluate(() => window.scrollBy(0, Math.random() * 500 + 400));
    await sleep(rand(3000, 5000));
  }

  console.log(`   완료: ${results.length}개 좋아요`);
  return results;
}

module.exports = { engage };
