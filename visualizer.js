#!/usr/bin/env node
// visualizer.js — The Visualizer: 본문 기반 시각 자료 매칭
// 1) LLM으로 키워드 추출
// 2) 원본 소스에서 이미지 추출 (og:image, 본문 img)
// 3) 없으면 Bing Image Search로 매칭
const sleep = ms => new Promise(r => setTimeout(r, ms));

const LLM_API = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const LLM_KEY = 'd96625c9a4c74e3ba91e43c08b3a0e8b.SfrMqmS5pOqfRwUK';
const LLM_MODEL = 'glm-5-turbo';

// 1. LLM으로 시각 키워드 추출
async function extractVisualKeywords(content, sourceUrl) {
  const title = content.split('\n')[0].substring(0, 200);
  const body = content.substring(0, 800);
  
  try {
    const res = await fetch(LLM_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LLM_KEY}`,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        max_tokens: 200,
        messages: [{
          role: 'system',
          content: '너는 시각 자료 큐레이터다. 주어진 글을 읽고, 이 글에 첨부할 가장 적절한 이미지나 영상을 찾기 위한 검색 키워드를 한국어로 1~2개만 출력해. 형식: "키워드1, 키워드2". 이미지가 필요 없는 글이면 "없음"이라고 해.'
        }, {
          role: 'user',
          content: `제목: ${title}\n\n본문: ${body}\n\n소스: ${sourceUrl || '없음'}`
        }]
      })
    });
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim() || '';
    if (text.includes('없음')) return [];
    return text.split(',').map(k => k.trim()).filter(k => k.length > 0).slice(0, 2);
  } catch (e) {
    return [];
  }
}

// 2. 원본 소스에서 이미지 URL 추출
async function scrapeSourceImages(sourceUrl) {
  if (!sourceUrl) return [];
  try {
    const res = await fetch(sourceUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Bot/1.0)' },
      signal: AbortSignal.timeout(8000)
    });
    const html = await res.text();
    const images = [];

    // og:image
    const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    if (ogMatch) images.push({ url: ogMatch[1], type: 'og' });

    // twitter:image
    const twMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
    if (twMatch) images.push({ url: twMatch[1], type: 'twitter' });

    // 본문 img (gif 우선, jpg/png 다음)
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let imgMatch;
    const seen = new Set();
    while ((imgMatch = imgRegex.exec(html)) !== null && images.length < 3) {
      let url = imgMatch[1];
      if (url.startsWith('//')) url = 'https:' + url;
      if (url.startsWith('http') && !seen.has(url) && /\.(gif|png|jpg|jpeg|webp)/i.test(url)) {
        // GIF 우선
        const isGif = /\.gif/i.test(url);
        if (isGif) images.unshift({ url, type: 'inline-gif' });
        else images.push({ url, type: 'inline' });
        seen.add(url);
      }
    }

    return images.slice(0, 3);
  } catch (e) {
    return [];
  }
}

// 3. Bing Image Search로 매칭
async function bingImageSearch(keyword) {
  if (!keyword) return null;
  try {
    const res = await fetch(`https://www.bing.com/images/search?q=${encodeURIComponent(keyword)}&first=1&count=5`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(8000)
    });
    const html = await res.text();
    // Bing 이미지 결과에서 murl 추출
    const murls = [];
    const regex = /"murl":"([^"]+)"/g;
    let m;
    while ((m = regex.exec(html)) !== null && murls.length < 2) {
      let url = m[1].replace(/\\u002F/g, '/').replace(/&amp;/g, '&');
      if (url.startsWith('http') && /\.(jpg|jpeg|png|gif|webp)/i.test(url)) {
        murls.push({ url, type: 'bing' });
      }
    }
    return murls.length > 0 ? murls : null;
  } catch (e) {
    return null;
  }
}

// 메인: 본문 + 소스URL → media URLs 배열
async function visualize(content, sourceUrl) {
  console.log('   🔍 Visualizer: 시각 자료 매칭 중...');

  // 1) 원본 소스에서 이미지 추출
  let mediaUrls = [];
  if (sourceUrl) {
    const sourceImages = await scrapeSourceImages(sourceUrl);
    if (sourceImages.length > 0) {
      console.log(`   📷 소스 이미지 ${sourceImages.length}개 발견`);
      mediaUrls = sourceImages;
    }
  }

  // 2) LLM 키워드 추출 + Bing 검색 (소스에 이미지 없거나 보완 필요 시)
  const keywords = await extractVisualKeywords(content, sourceUrl);
  if (keywords.length > 0) {
    console.log(`   🏷️ 키워드: ${keywords.join(', ')}`);
    for (const kw of keywords) {
      if (mediaUrls.length >= 2) break;
      const bingResults = await bingImageSearch(kw);
      if (bingResults) {
        mediaUrls.push(...bingResults);
        console.log(`   🔎 Bing 매칭: ${bingResults.length}개`);
      }
      await sleep(500);
    }
  }

  // 최대 3개, URL만
  const result = mediaUrls.slice(0, 3).map(m => m.url);
  console.log(`   ✅ 매칭 결과: ${result.length}개`);
  return result;
}

module.exports = { visualize, extractVisualKeywords, scrapeSourceImages, bingImageSearch };
