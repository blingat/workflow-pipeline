#!/usr/bin/env node
// scanner.js — 1단계: 피드 스캔 → 상호작용 후보 수집
const path = require('path');
const fs = require('fs');
const { jitter, sleep } = require('./stealth_utils');

const PROCESSED_FILE = path.join(__dirname, '.aging_processed.json');
const MAX_FEED_ROUNDS = 15;
const MAX_CANDIDATES = 50;

function loadProcessed() {
  try { return JSON.parse(fs.readFileSync(PROCESSED_FILE, 'utf-8')); } catch { return { posts: {}, authors: {} }; }
}

function saveProcessed(data) {
  fs.writeFileSync(PROCESSED_FILE, JSON.stringify(data, null, 2));
}

async function scanFeed(page, { maxRounds = MAX_FEED_ROUNDS, maxCandidates = MAX_CANDIDATES } = {}) {
  const processed = loadProcessed();
  const candidates = { posts: [], authors: [] };
  const seenAuthors = new Set();

  // 0. 탐색 피드(Explore) 먼저 스크롤 — 새 계정/글 노출 확대
  console.log('🔍 탐색 피드 스크롤 (새 글 확보)...');
  try {
    await page.goto('https://www.threads.net/explore', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(3000);
    // 탐색 피드에서 5라운드 스크롤
    for (let r = 0; r < 5; r++) {
      const explorePosts = page.locator('[data-pressable-container]');
      const epCount = await explorePosts.count().catch(() => 0);
      for (let i = 0; i < Math.min(6, epCount); i++) {
        try {
          const post = explorePosts.nth(i);
          if (!(await post.isVisible({ timeout: 300 }).catch(() => false))) continue;
          const authorEl = post.locator('a[href^="/@"]').first();
          const authorHref = await authorEl.getAttribute('href').catch(() => '');
          const author = (authorHref || '').replace('/@', '').replace(/^\/$/, '');
          if (!author || author === 'ai.pacaa') continue;
          let postId = null;
          try {
            const postLink = await post.locator('a[href*="/post/"]').first().getAttribute('href').catch(() => null);
            postId = postLink?.match(/\/post\/([a-zA-Z0-9_-]+)/)?.[1];
          } catch {}
          if (!postId || processed.posts[postId]) continue;
          const unlikeSvg = post.locator('svg[aria-label="좋아요 취소"]').first();
          const alreadyLiked = await unlikeSvg.isVisible({ timeout: 300 }).catch(() => false);
          let postText = '';
          try {
            const spans = post.locator('span[dir="auto"]');
            for (let s = 0; s < Math.min(5, await spans.count()); s++) {
              const txt = await spans.nth(s).innerText({ timeout: 300 }).catch(() => '');
              if (txt && txt.length > 15) { postText = txt; break; }
            }
          } catch {}
          let href = null;
          try {
            const postLink = await post.locator('a[href*="/post/"]').first().getAttribute('href').catch(() => null);
            if (postLink) href = postLink.startsWith('http') ? postLink : `https://www.threads.net${postLink}`;
          } catch {}
          if (candidates.posts.length < maxCandidates) {
            candidates.posts.push({ postId, author, postText: postText.substring(0, 200), alreadyLiked, href });
            if (!alreadyLiked) processed.posts[postId] = Date.now();
          }
          if (!seenAuthors.has(author) && candidates.authors.length < maxCandidates) {
            seenAuthors.add(author);
            candidates.authors.push({ username: author, href: `https://www.threads.net/@${author}` });
          }
        } catch {}
      }
      await page.evaluate(() => window.scrollBy(0, Math.random() * 500 + 400));
      await sleep(1500 + Math.random() * 2000);
    }
    console.log(`   탐색에서 ${candidates.posts.length}개 후보 확보`);
  } catch (e) {
    console.log(`   탐색 스크롤 스킵: ${e.message?.substring(0, 40)}`);
  }

  // 1. 홈 피드로 복귀 후 기존 스캔
  console.log('🔍 홈 피드 스캔...');
  // 홈 피드로 이동
  try {
    await page.goto('https://www.threads.net/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(3000);
  } catch {}

  for (let round = 0; round < maxRounds; round++) {
    const feedPosts = page.locator('[data-pressable-container]');
    const feedCount = await feedPosts.count().catch(() => 0);
    if (feedCount === 0) { await page.evaluate(() => window.scrollBy(0, 600)); await sleep(2000); continue; }

    for (let i = 0; i < Math.min(8, feedCount); i++) {
      try {
        const post = feedPosts.nth(i);
        if (!(await post.isVisible().catch(() => false))) continue;

        // 작성자
        const authorEl = post.locator('a[href^="/@"]').first();
        const authorHref = await authorEl.getAttribute('href').catch(() => '');
        const author = (authorHref || '').replace('/@', '').replace(/^\/$/, '');
        if (!author || author === 'ai.pacaa') continue;

        // post ID
        let postId = null;
        try {
          const postLink = await post.locator('a[href*="/post/"]').first().getAttribute('href').catch(() => null);
          postId = postLink?.match(/\/post\/([a-zA-Z0-9_-]+)/)?.[1];
        } catch {}

        // 이미 좋아요 여부
        const unlikeSvg = post.locator('svg[aria-label="좋아요 취소"]').first();
        const alreadyLiked = await unlikeSvg.isVisible({ timeout: 300 }).catch(() => false);

        // 중복 제외
        if (postId && processed.posts[postId]) continue;

        // 글 텍스트
        let postText = '';
        try {
          const spans = post.locator('span[dir="auto"]');
          for (let s = 0; s < Math.min(5, await spans.count()); s++) {
            const txt = await spans.nth(s).innerText({ timeout: 300 }).catch(() => '');
            if (txt && txt.length > 15) { postText = txt; break; }
          }
        } catch {}

        // 상세 링크
        let href = null;
        try {
          const postLink = await post.locator('a[href*="/post/"]').first().getAttribute('href').catch(() => null);
          if (postLink) href = postLink.startsWith('http') ? postLink : `https://www.threads.net${postLink}`;
        } catch {}

        // 게시물 후보
        if (postId && candidates.posts.length < maxCandidates) {
          candidates.posts.push({ postId, author, postText: postText.substring(0, 200), alreadyLiked, href });
          if (!alreadyLiked) processed.posts[postId] = Date.now();
        }

        // 작성자 후보 (중복 제외)
        if (!seenAuthors.has(author) && candidates.authors.length < maxCandidates) {
          seenAuthors.add(author);
          candidates.authors.push({ username: author, href: `https://www.threads.net/@${author}` });
        }
      } catch {}
    }

    // 스크롤
    await page.evaluate(() => window.scrollBy(0, Math.random() * 600 + 300));
    await sleep(2000 + Math.random() * 3000);

    if (candidates.posts.length >= maxCandidates) break;
  }

  // 정리: 24시간 이상 된 processed 제거
  const now = Date.now();
  for (const key of Object.keys(processed.posts)) {
    if (now - processed.posts[key] > 86400000) delete processed.posts[key];
  }
  saveProcessed(processed);

  console.log(`   게시물 후보: ${candidates.posts.length}개 (좋아요 제외: ${candidates.posts.filter(p => p.alreadyLiked).length}개)`);
  console.log(`   작성자 후보: ${candidates.authors.length}개`);

  return candidates;
}

module.exports = { scanFeed };
