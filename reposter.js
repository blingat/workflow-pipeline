#!/usr/bin/env node
// reposter.js — 3단계: 리포스트 (베지에 마우스 + Jitter 딜레이)
const { jitter, sleep, humanDelay, humanClick } = require('./stealth_utils');
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

async function waitForGQL(page, timeout = 8000) {
  return new Promise(resolve => {
    const handler = async (response) => {
      if (response.url().includes('/graphql') && response.request().method() === 'POST') {
        try {
          const body = await response.text();
          if (/repost_count/i.test(body)) {
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

async function repost(page, candidates, { maxReposts = 3 } = {}) {
  const results = [];
  const shuffled = candidates.posts.sort(() => Math.random() - 0.5);

  console.log(`🔄 리포스트 시작 (목표: ${maxReposts}개)`);

  for (const post of shuffled) {
    if (results.length >= maxReposts) break;
    if (Math.random() > 0.30) continue; // 30% 확률

    try {
      const feedPosts = page.locator('[data-pressable-container]');
      const feedCount = await feedPosts.count().catch(() => 0);

      for (let i = 0; i < Math.min(feedCount, 6); i++) {
        const fp = feedPosts.nth(i);
        if (!(await fp.isVisible().catch(() => false))) continue;

        const repostSvg = fp.locator('svg[aria-label="리포스트"]').first();
        if (!(await repostSvg.isVisible({ timeout: 1500 }).catch(() => false))) continue;

        await humanClick(page, repostSvg);
        await sleep(2000);

        const confirmBtn = page.locator('[role="menu"]').locator('text=리포스트').first();
        if (!(await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
          await page.keyboard.press('Escape');
          continue;
        }

        const gql = waitForGQL(page);
        await humanClick(page, confirmBtn);
        const result = await gql;

        results.push({
          author: post.author,
          postId: post.postId,
          graphql: result ? `${result.status}` : '미캡처'
        });
        console.log(`   🔄 #${results.length} → @${post.author} [GQL:${result ? result.status : '미캡처'}]`);
        await sleep(rand(2000, 4000));
        break;
      }
    } catch {}
  }

  console.log(`   완료: ${results.length}개 리포스트`);
  return results;
}

module.exports = { repost };
