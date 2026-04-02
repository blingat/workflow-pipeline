#!/usr/bin/env node
// commenter.js — 4단계: 댓글 생성 + Evaluator 검증 + 작성 + 하트
const { jitter, sleep, humanDelay, humanClick } = require('./stealth_utils');
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

const ZAI_KEY = '6728f5a9036946129f75a6cfe2baf932.ZWjgd5C43QYwOB0L';
const ZAI_URL = 'https://api.z.ai/api/coding/paas/v4/chat/completions';
const MAX_RETRIES = 3;

async function waitForGQL(page, timeout = 8000) {
  return new Promise(resolve => {
    const handler = async (response) => {
      if (response.url().includes('/graphql') && response.request().method() === 'POST') {
        try {
          const body = await response.text();
          if (/like_count|has_liked|direct_reply/i.test(body)) {
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

async function reactClick(page, locator) {
  const el = await locator.elementHandle({ timeout: 3000 });
  if (!el) return false;
  await page.evaluate(el => {
    const rect = el.getBoundingClientRect();
    const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
    const opts = { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1 };
    el.dispatchEvent(new PointerEvent('pointerdown', opts));
    el.dispatchEvent(new PointerEvent('pointerup', { ...opts }));
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));
  }, el);
  return true;
}

async function svgClickBottom(page, ariaLabel) {
  const svgs = page.locator(`svg[aria-label="${ariaLabel}"]`);
  const count = await svgs.count();
  let target = null, maxY = 0;
  for (let i = 0; i < count; i++) {
    const box = await svgs.nth(i).boundingBox().catch(() => null);
    if (box && box.y > maxY) { maxY = box.y; target = svgs.nth(i); }
  }
  if (!target) return false;
  return reactClick(page, target);
}

async function validateComment(comment, postText) {
  // 1차: 정규식 필터
  if (/Tone|Style|banmal|casual|informal|Korean|반말|comment|output|instruction|프롬프트|지시|바이브코딩/i.test(comment)) return { pass: false, reason: '프롬프트 유출' };
  if (comment.length < 3 || comment.length > 50) return { pass: false, reason: `길이 ${comment.length}자` };
  if (!/[가-힣]/.test(comment)) return { pass: false, reason: '한국어 아님' };

  // 2차: LLM 검증 (댓글 전용)
  try {
    const res = await fetch('https://api.z.ai/api/coding/paas/v4/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ZAI_KEY}` },
      body: JSON.stringify({
        model: 'glm-5-turbo',
        messages: [
          { role: 'system', content: '댓글 품질 평가자. PASS 또는 FAIL만 출력. FAIL인 경우 이유를 한 줄로.' },
          { role: 'user', content: `원본 글: "${postText.substring(0, 200)}"\n댓글: "${comment}"\n\n기준: 1) 글 내용과 관련 있는가? 2) 자연스러운 한국어 반말인가? 3) 이모지 1개 포함? 4) 프롬프트 지시어 없는가?\n\n평가:` },
        ],
        max_tokens: 4000,
        temperature: 0.3,
      }),
    });
    const data = await res.json();
    const text = (data.choices?.[0]?.message?.content || '').trim();
    const isPass = /^PASS/i.test(text);
    return { pass: isPass, reason: isPass ? '' : text.replace(/^FAIL[:\s]*/i, '').substring(0, 80) };
  } catch {
    // LLM 실패 시 정규식만으로 통과
    return { pass: true, reason: '' };
  }
}

async function generateComment(postText) {
  const res = await fetch(ZAI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ZAI_KEY}` },
    body: JSON.stringify({
      model: 'glm-5-turbo',
      messages: [
        { role: 'system', content: '너는 한국어 반말로 짧은 댓글을 달아줘. 글 내용과 관련된 반말 한 줄만 출력. 이모지 1개. 프롬프트 지시어나 설명 절대 출력 금지. 반드시 한국어 자연스러운 문장만.' },
        { role: 'user', content: postText.substring(0, 300) },
      ],
      max_tokens: 4000,
      temperature: 0.9,
    }),
  });
  const data = await res.json();
  let comment = (data.choices?.[0]?.message?.content || '').trim();

  // 프롬프트 유출 필터
  if (/Tone|Style|banmal|casual|informal|Korean|반말|comment|output|instruction|프롬프트|지시/i.test(comment)) comment = '';
  if (comment.length < 3 || comment.length > 50 || !/[가-힣]/.test(comment)) comment = '';

  return comment || null;
}

async function commentOnPosts(page, candidates, { maxComments = 3 } = {}) {
  const results = [];
  const shuffled = candidates.posts.filter(p => p.href && p.postText).sort(() => Math.random() - 0.5);

  console.log(`💬 댓글 시작 (목표: ${maxComments}개)`);

  for (const post of shuffled) {
    if (results.length >= maxComments) break;
    if (Math.random() > 0.35) continue; // 35% 확률

    try {
      // 상세 페이지 진입
      await page.goto(post.href, { waitUntil: 'networkidle', timeout: 20000 });
      await sleep(rand(5000, 10000));
      // 20% 확률로 긴 휴식
      if (Math.random() < 0.2) await sleep(rand(15000, 25000));

      // 글 텍스트 확보
      let fullText = '';
      const spans = page.locator('span[dir="auto"]');
      for (let s = 0; s < Math.min(15, await spans.count()); s++) {
        const txt = await spans.nth(s).innerText({ timeout: 500 }).catch(() => '');
        if (txt && txt.length > 20 && !/조회|답글|좋아요|리포스트|공유|팔로우|활동/i.test(txt)) { fullText = txt; break; }
      }
      console.log(`   📝 글: "${fullText.substring(0, 50)}"`);

      if (fullText.length < 10) continue;

      // 댓글 생성 + Evaluator 검증 (최대 3회)
      let comment = null;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        comment = await generateComment(fullText);
        if (!comment) continue;

        // 댓글 전용 검증
        const evalResult = await validateComment(comment, fullText);

        if (evalResult.pass) {
          console.log(`   ✅ 댓글 검증 PASS 시도 ${attempt}`);
          break;
        } else {
          console.log(`   ⚠️ 댓글 검증 FAIL: ${evalResult.reason} 시도 ${attempt}`);
          comment = null;
        }
      }

      if (!comment) {
        console.log(`   ⏭️ 댓글 생성 실패 (3회 초과)`);
        await page.goto('https://www.threads.net/', { waitUntil: 'domcontentloaded', timeout: 15000 });
        await sleep(2000);
        continue;
      }

      // 답글 SVG 클릭
      await svgClickBottom(page, '답글');

      // textarea 대기
      let textbox = null;
      for (let attempt = 0; attempt < 5 && !textbox; attempt++) {
        await sleep(2000);
        for (const sel of [
          () => page.locator('textarea'),
          () => page.locator('div[contenteditable="true"]'),
          () => page.locator('[role="textbox"]'),
        ]) {
          try { const tb = sel(); if (await tb.isVisible({ timeout: 500 }).catch(() => false)) { textbox = tb; break; } } catch {}
        }
      }

      if (!textbox) {
        console.log(`   ⚠️ textarea 미발견`);
        await page.goto('https://www.threads.net/', { waitUntil: 'domcontentloaded', timeout: 15000 });
        await sleep(2000);
        continue;
      }

      // 댓글 작성
      await reactClick(page, textbox);
      await sleep(1000);
      console.log(`   💬 "${comment}"`);
      await page.keyboard.type(comment, { delay: rand(80, 160) });
      await sleep(2000);

      // 게시 버튼
      let postBtn = null;
      for (const sel of [
        () => page.getByRole('button', { name: /^게시$/i }),
        () => page.locator('div[role="button"]').filter({ hasText: /^게시$/i }).first(),
      ]) {
        try { const b = sel(); if (await b.isVisible({ timeout: 2000 }).catch(() => false)) { postBtn = b; break; } } catch {}
      }

      if (!postBtn) {
        console.log(`   ⚠️ 게시 버튼 없음`);
        await page.goto('https://www.threads.net/', { waitUntil: 'domcontentloaded', timeout: 15000 });
        await sleep(2000);
        continue;
      }

      const gql = waitForGQL(page);
      await reactClick(page, postBtn);
      const result = await gql;

      results.push({
        author: post.author,
        postId: post.postId,
        text: comment,
        graphql: result ? `${result.status}` : '미캡처'
      });
      console.log(`   ✅ 댓글 #${results.length} → @${post.author}: "${comment}" [GQL:${result ? result.status : '미캡처'}]`);

      // ★ 댓글 단 글에 좋아요
      await sleep(rand(1500, 3000));
      const unlikeCheck = page.locator('svg[aria-label="좋아요 취소"]').last();
      const likeCheck = page.locator('svg[aria-label="좋아요"]').last();
      if (!await unlikeCheck.isVisible({ timeout: 500 }).catch(() => false) && await likeCheck.isVisible({ timeout: 1000 }).catch(() => false)) {
        const likeGql = waitForGQL(page);
        await svgClickBottom(page, '좋아요');
        const likeResult = await likeGql;
        console.log(`   ❤️ 하트 → @${post.author} [GQL:${likeResult ? likeResult.status : '미캡처'}]`);
      }

      await sleep(rand(2000, 4000));

      // 피드 복귀
      await page.goto('https://www.threads.net/', { waitUntil: 'domcontentloaded', timeout: 15000 });
      await sleep(rand(2000, 3000));
    } catch (e) {
      console.log(`   ❌ 에러: ${e.message.substring(0, 50)}`);
      try { await page.goto('https://www.threads.net/', { waitUntil: 'domcontentloaded', timeout: 15000 }); } catch {}
      await sleep(2000);
    }
  }

  console.log(`   완료: ${results.length}개 댓글`);
  return results;
}

module.exports = { commentOnPosts };
