// collector.js v3 — AI 전용 RSS 수집 + 키워드 필터
const { Pool } = require('pg');
const DB_URL = 'postgresql://neondb_owner:npg_OZ8lmEfJDg4e@ep-purple-recipe-a1l3vs4n-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// AI 필터 키워드 (제목에 하나라도 있어야 수집)
const AI_KEYWORDS = [
  'AI', 'artificial intelligence', 'GPT', 'chatgpt', 'claude', 'gemini', 'llm', 'language model',
  'deep learning', '머신러닝', '인공지능', '딥러닝', '생성형', '에이전트', 'agent',
  'openai', 'anthropic', 'google ai', 'meta ai', 'hugging face',
  'ai tool', 'ai 도구', 'ai 툴', '프롬프트', 'prompt', '자동화',
  'copilot', 'coding ai', 'ai 코딩', 'ai 영상', 'ai 이미지', '이미지 생성', '영상 생성',
  'sora', 'midjourney', 'stable diffusion', 'flux', 'dall-e', 'runway', 'kling',
  '노코드', 'low-code', 'n8n', 'make', 'zapier', '자동화 툴',
  'ai 비즈니스', 'ai 스타트업', 'ai 투자',
];

// AI 전용 RSS 소스
const RSS_SOURCES = [
  // 해외 AI 전용
  { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', category: 'ai-news' },
  { name: 'The Verge AI', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', category: 'ai-news' },
  { name: 'VentureBeat AI', url: 'https://venturebeat.com/category/ai/feed/', category: 'ai-news' },
  { name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml', category: 'official' },
  { name: 'Anthropic Blog', url: 'https://www.anthropic.com/blog/rss.xml', category: 'official' },
  { name: 'Google AI Blog', url: 'https://blog.google/technology/ai/rss/', category: 'official' },
  { name: 'Hugging Face Blog', url: 'https://huggingface.co/blog/feed.xml', category: 'tools' },
  { name: 'Cursor Blog', url: 'https://www.cursor.com/blog/rss.xml', category: 'tools' },
  { name: 'Replicate Blog', url: 'https://replicate.com/blog/rss.xml', category: 'tools' },
  { name: 'fal.ai Blog', url: 'https://blog.fal.ai/rss/', category: 'tools' },
  { name: 'ElevenLabs Blog', url: 'https://elevenlabs.io/blog/rss.xml', category: 'tools' },
  { name: 'Runway ML Blog', url: 'https://runwayml.com/blog/rss.xml', category: 'tools' },
  { name: 'Luma AI Blog', url: 'https://lumalabs.ai/blog/rss.xml', category: 'tools' },
  { name: 'Stability AI', url: 'https://stability.ai/blog/feed', category: 'tools' },
  { name: 'Ben\'s Bites', url: 'https://bensbites.beehiiv.com/feed', category: 'newsletter' },
  { name: 'Ars Technica AI', url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', category: 'ai-news' },
  { name: 'Wired AI', url: 'https://www.wired.com/feed/tag/ai/latest/rss', category: 'ai-news' },
  // Product Hunt AI
  { name: 'Product Hunt AI', url: 'https://www.producthunt.com/feed?category=artificial-intelligence', category: 'tools' },
  // GitHub Trending (한국어용)
  { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/', category: 'research' },
  // 한국어 AI
  { name: 'AI타임스', url: 'https://www.aitimes.com/rss/allArticle.xml', category: 'kr-news' },
  { name: '인공지능신문', url: 'https://www.aitimes.kr/rss/allArticle.xml', category: 'kr-news' },
  { name: 'GeekNews', url: 'https://news.hada.io/rss/news', category: 'kr-news' },
];

function isAIRelevant(title, description) {
  const text = (title + ' ' + description).toLowerCase();
  return AI_KEYWORDS.some(kw => text.includes(kw.toLowerCase()));
}

async function fetchRSS(source) {
  try {
    const res = await fetch(source.url, { headers: { 'User-Agent': 'AI-News-Radar/1.0' }, signal: AbortSignal.timeout(10000) });
    const text = await res.text();
    const items = [];
    const regex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const xml = match[1];
      const title = (xml.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || xml.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1]?.trim();
      const link = (xml.match(/<link[^>]*>(.*?)<\/link>/) || [])[1]?.trim();
      const description = (xml.match(/<description[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || xml.match(/<description[^>]*>([\s\S]*?)<\/description>/) || [])[1]?.trim();
      if (title && link) {
        items.push({
          title: title.replace(/<[^>]*>/g, '').substring(0, 200),
          link,
          description: (description || '').replace(/<[^>]*>/g, '').substring(0, 500),
        });
      }
    }
    return items;
  } catch (e) {
    return [];
  }
}

(async () => {
  const pool = new Pool({ connectionString: DB_URL });
  console.log('=== AI 뉴스 수집 시작 ===\n');

  let totalCollected = 0, totalFiltered = 0;
  const shuffled = [...RSS_SOURCES].sort(() => Math.random() - 0.5).slice(0, 8);

  for (const source of shuffled) {
    console.log(`📡 ${source.name}...`);
    const items = await fetchRSS(source);
    
    let collected = 0, filtered = 0;
    for (const item of items.slice(0, 8)) {
      // AI 관련성 필터
      if (!isAIRelevant(item.title, item.description)) {
        filtered++;
        continue;
      }

      try {
        const postId = Buffer.from(item.link).toString('base64').substring(0, 20);
        const exists = await pool.query('SELECT 1 FROM collected_posts WHERE post_id = $1', [postId]);
        if (exists.rows.length > 0) continue;

        await pool.query(
          `INSERT INTO collected_posts (post_id, author, content, hashtags, engagement_score, collected_at, source_url)
           VALUES ($1, $2, $3, $4, $5, NOW(), $6)
           ON CONFLICT (post_id) DO NOTHING`,
          [postId, source.name, item.title + (item.description ? '\n\n' + item.description : ''),
           [source.category, 'rss'], rand(30, 80) / 100, item.link]
        );
        collected++;
        totalCollected++;
        console.log(`  ✅ "${item.title.substring(0, 60)}..."`);
      } catch (e) {}
    }
    totalFiltered += filtered;
    console.log(`  ${items.length}개 → 필터 ${filtered}통과 ${collected}수집`);
    await sleep(rand(500, 1500));
  }

  // 키워드 트렌드 업데이트
  const { rows: recentPosts } = await pool.query("SELECT content FROM collected_posts WHERE collected_at > NOW() - INTERVAL '7 days' LIMIT 200");
  const kwCount = {};
  const trackKw = ['AI 에이전트','ChatGPT','Claude','Gemini','GPT','자동화','이미지 생성','영상 생성','Copilot','LLM','오픈소스','API','프롬프트','RAG','멀티모달','AI 코딩','노코드'];
  for (const post of recentPosts) {
    const text = (post.content || '').toLowerCase();
    for (const kw of trackKw) {
      if (text.includes(kw.toLowerCase())) kwCount[kw] = (kwCount[kw] || 0) + 1;
    }
  }
  const today = new Date().toISOString().split('T')[0];
  let trendCount = 0;
  for (const [kw, count] of Object.entries(kwCount).sort((a, b) => b[1] - a[1])) {
    await pool.query("INSERT INTO keyword_trends (keyword, date, mention_count, growth_rate, is_new, category) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING",
      [kw, today, count, rand(10, 200) / 100, count <= 1, 'tech']);
    trendCount++;
  }

  const total = await pool.query('SELECT count(*) FROM collected_posts');
  console.log(`\n=== 수집 완료: ${totalCollected}개 (AI필터 ${totalFiltered}개 차단) | DB 총 ${total.rows[0].count}개 | 트렌드 ${trendCount}개 ===`);

  await pool.end();
})();
