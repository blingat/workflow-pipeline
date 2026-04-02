// card_generator.js v3 — 3가지 스타일 카드 (숫자강조/서비스캡처/인포그래픽)
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MEDIA_DIR = path.join(__dirname, 'media', 'cards');
const ASSETS_DIR = path.join(__dirname, 'assets');
if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });

const FONTS = {
  regular: `url('file://${path.join(__dirname, 'fonts', 'Pretendard-Regular.otf')}')`,
  bold: `url('file://${path.join(__dirname, 'fonts', 'Pretendard-Bold.otf')}')`,
};

const PALETTES = [
  { bg: '#0f172a', bg2: '#1e293b', ac: '#3b82f6', sub: '#94a3b8', tag: 'AI 뉴스' },
  { bg: '#1a1a2e', bg2: '#16213e', ac: '#8b5cf6', sub: '#a5b4fc', tag: '꿀팁' },
  { bg: '#18181b', bg2: '#27272a', ac: '#ec4899', sub: '#f9a8d4', tag: '트렌드' },
  { bg: '#0c0a09', bg2: '#1c1917', ac: '#f59e0b', sub: '#fcd34d', tag: '비교' },
  { bg: '#0f172a', bg2: '#134e4a', ac: '#10b981', sub: '#6ee7b7', tag: '도구' },
  { bg: '#1e1b2e', bg2: '#2e1065', ac: '#6366f1', sub: '#a5b4fc', tag: '인사이트' },
  { bg: '#0f172a', bg2: '#164e63', ac: '#06b6d4', sub: '#67e8f9', tag: '속보' },
];

const EMOJIS = ['🚀','💡','🔥','⚡','🎯','📊','💰','🤖','✨','🏆','💎','🌟','📢','🔑','💻','📱'];

function pick(title) {
  const i = Math.abs([...title].reduce((a, c) => a + c.charCodeAt(0), 0)) % PALETTES.length;
  return PALETTES[i];
}

function cut(s, n) { return s.length > n ? s.substring(0, n) + '…' : s; }
function randEmoji() { return EMOJIS[Math.floor(Math.random() * EMOJIS.length)]; }

// 스타일 1: 숫자/이모지 강조형 — 큰 숫자 + 이모지 + 강렬한 포인트
function styleNumberEmoji({ title, body, palette, slideIndex, totalSlides, avatarPath }) {
  const { bg, ac, sub, tag } = palette;
  const lines = (body || '').split('\n').filter(l => l.trim()).slice(0, 3);
  const emoji = randEmoji();
  const slideNum = totalSlides > 1 ? `${slideIndex + 1}/${totalSlides}` : '';

  const points = lines.map((l, i) => `
    <div class="point">
      <div class="point-num" style="background:${ac}">${i + 1}</div>
      <div class="point-text">${cut(l, 35)}</div>
    </div>
  `).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @font-face { font-family: 'Pretendard'; src: ${FONTS.regular}; font-weight: 400; }
    @font-face { font-family: 'Pretendard'; src: ${FONTS.bold}; font-weight: 700; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { width:1080px; height:1080px; font-family:'Pretendard',sans-serif; background:${bg}; color:#f8fafc; display:flex; flex-direction:column; overflow:hidden; position:relative; }
    .bg-glow { position:absolute; top:-80px; right:-80px; width:350px; height:350px; border-radius:50%; background:${ac}; opacity:0.08; filter:blur(40px); }
    .bg-glow2 { position:absolute; bottom:-120px; left:-60px; width:250px; height:250px; border-radius:50%; background:${ac}; opacity:0.05; filter:blur(60px); }
    .top { padding:56px 64px 0; display:flex; justify-content:space-between; align-items:center; }
    .badge { padding:10px 20px; border-radius:24px; background:${ac}18; border:1px solid ${ac}33; font-size:17px; color:${ac}; font-weight:700; }
    .slide-num { font-size:16px; color:#475569; font-weight:700; }
    .hero { flex:1; display:flex; flex-direction:column; justify-content:center; padding:40px 64px; gap:36px; }
    .hero-emoji { font-size:72px; }
    .hero-title { font-size:54px; font-weight:800; line-height:1.3; letter-spacing:-1.5px; }
    .hero-title .highlight { color:${ac}; }
    .points { display:flex; flex-direction:column; gap:20px; }
    .point { display:flex; align-items:center; gap:20px; }
    .point-num { width:48px; height:48px; border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:22px; font-weight:800; color:#fff; flex-shrink:0; }
    .point-text { font-size:24px; color:${sub}; line-height:1.5; }
    .bottom { padding:0 64px 56px; display:flex; justify-content:space-between; align-items:center; }
    .handle { font-size:17px; color:#64748b; font-weight:600; }
    .cta { font-size:16px; color:${ac}; font-weight:600; opacity:0.8; }
  </style></head><body>
    <div class="bg-glow"></div><div class="bg-glow2"></div>
    <div class="top">
      <div class="badge">🦙 ${tag}</div>
      <div class="slide-num">${slideNum}</div>
    </div>
    <div class="hero">
      <div class="hero-emoji">${emoji}</div>
      <div class="hero-title">${cut(title, 40)}</div>
      <div class="points">${points}</div>
    </div>
    <div class="bottom">
      <div class="handle">@ai.pacaa</div>
      <div class="cta">글에서 자세히 👇</div>
    </div>
  </body></html>`;
}

// 스타일 2: 서비스 캡처형 — 가상 UI 프레임 안에 내용
function styleAppCapture({ title, body, palette, slideIndex, totalSlides, avatarPath }) {
  const { bg, bg2, ac, sub, tag } = palette;
  const lines = (body || '').split('\n').filter(l => l.trim()).slice(0, 4);
  const slideNum = totalSlides > 1 ? `${slideIndex + 1}/${totalSlides}` : '';

  const rows = lines.map((l, i) => `
    <div class="row">
      <div class="row-icon">${['📊','🔥','⚡','💎'][i % 4]}</div>
      <div class="row-content">
        <div class="row-title">${cut(l.split(/[:：]/)[0] || l, 20)}</div>
        <div class="row-desc">${cut(l.includes(':') ? l.split(/[:：]/).slice(1).join(':') : '', 30)}</div>
      </div>
      <div class="row-badge">${['NEW','HOT','TOP','KEY'][i % 4]}</div>
    </div>
  `).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @font-face { font-family: 'Pretendard'; src: ${FONTS.regular}; font-weight: 400; }
    @font-face { font-family: 'Pretendard'; src: ${FONTS.bold}; font-weight: 700; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { width:1080px; height:1080px; font-family:'Pretendard',sans-serif; background:${bg}; color:#f8fafc; display:flex; flex-direction:column; overflow:hidden; position:relative; }
    .top { padding:48px 64px 0; display:flex; justify-content:space-between; align-items:center; }
    .badge { padding:10px 20px; border-radius:24px; background:${ac}18; border:1px solid ${ac}33; font-size:17px; color:${ac}; font-weight:700; }
    .slide-num { font-size:16px; color:#475569; font-weight:700; }
    .frame { flex:1; margin:28px 64px; border-radius:24px; background:${bg2}; border:1px solid rgba(255,255,255,0.06); overflow:hidden; display:flex; flex-direction:column; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
    .frame-header { padding:20px 28px; border-bottom:1px solid rgba(255,255,255,0.06); display:flex; align-items:center; gap:12px; }
    .frame-dot { width:12px; height:12px; border-radius:50%; }
    .frame-url { flex:1; padding:6px 16px; border-radius:10px; background:rgba(255,255,255,0.04); font-size:14px; color:#475569; text-align:center; }
    .frame-body { flex:1; padding:32px 28px; display:flex; flex-direction:column; gap:8px; }
    .frame-title { font-size:28px; font-weight:800; margin-bottom:20px; line-height:1.3; color:${ac}; }
    .row { display:flex; align-items:center; gap:16px; padding:18px 20px; border-radius:16px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.04); }
    .row-icon { font-size:28px; flex-shrink:0; width:48px; text-align:center; }
    .row-content { flex:1; }
    .row-title { font-size:18px; font-weight:700; color:#f1f5f9; margin-bottom:4px; }
    .row-desc { font-size:15px; color:#64748b; }
    .row-badge { padding:6px 12px; border-radius:8px; background:${ac}22; color:${ac}; font-size:12px; font-weight:800; flex-shrink:0; }
    .bottom { padding:0 64px 48px; display:flex; justify-content:space-between; align-items:center; }
    .handle { font-size:17px; color:#64748b; font-weight:600; }
    .cta { font-size:16px; color:${ac}; font-weight:600; opacity:0.8; }
  </style></head><body>
    <div class="top">
      <div class="badge">🦙 ${tag}</div>
      <div class="slide-num">${slideNum}</div>
    </div>
    <div class="frame">
      <div class="frame-header">
        <div class="frame-dot" style="background:#ef4444"></div>
        <div class="frame-dot" style="background:#f59e0b"></div>
        <div class="frame-dot" style="background:#22c55e"></div>
        <div class="frame-url">ai.pacaa — ${tag}</div>
      </div>
      <div class="frame-body">
        <div class="frame-title">${cut(title, 35)}</div>
        ${rows}
      </div>
    </div>
    <div class="bottom">
      <div class="handle">@ai.pacaa</div>
      <div class="cta">글에서 자세히 👇</div>
    </div>
  </body></html>`;
}

// 스타일 3: 인포그래픽형 — 아이콘 + 차트 느낌
function styleInfographic({ title, body, palette, slideIndex, totalSlides, avatarPath }) {
  const { bg, ac, sub, tag } = palette;
  const lines = (body || '').split('\n').filter(l => l.trim()).slice(0, 3);
  const slideNum = totalSlides > 1 ? `${slideIndex + 1}/${totalSlides}` : '';
  const icons = ['📈','🎯','🧠','💡','🔧','🚀','💰','⚡'];

  const cards = lines.map((l, i) => {
    const icon = icons[(Math.abs([...title].reduce((a,c)=>a+c.charCodeAt(0),0)) + i) % icons.length];
    const pct = [85, 70, 60][i] || 50;
    return `
    <div class="info-card">
      <div class="info-icon">${icon}</div>
      <div class="info-text">${cut(l, 28)}</div>
      <div class="info-bar"><div class="info-bar-fill" style="width:${pct}%; background:${ac}"></div></div>
    </div>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @font-face { font-family: 'Pretendard'; src: ${FONTS.regular}; font-weight: 400; }
    @font-face { font-family: 'Pretendard'; src: ${FONTS.bold}; font-weight: 700; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { width:1080px; height:1080px; font-family:'Pretendard',sans-serif; background:${bg}; color:#f8fafc; display:flex; flex-direction:column; overflow:hidden; position:relative; }
    .bg-pattern { position:absolute; inset:0; opacity:0.03; background-image: radial-gradient(circle at 20px 20px, ${ac} 1px, transparent 1px); background-size: 40px 40px; }
    .top { padding:56px 64px 0; display:flex; justify-content:space-between; align-items:center; z-index:1; }
    .badge { padding:10px 20px; border-radius:24px; background:${ac}18; border:1px solid ${ac}33; font-size:17px; color:${ac}; font-weight:700; }
    .slide-num { font-size:16px; color:#475569; font-weight:700; }
    .hero { flex:1; display:flex; flex-direction:column; justify-content:center; padding:32px 64px; gap:32px; z-index:1; }
    .hero-tag { font-size:20px; color:${ac}; font-weight:700; letter-spacing:2px; text-transform:uppercase; }
    .hero-title { font-size:52px; font-weight:800; line-height:1.3; letter-spacing:-1px; }
    .info-grid { display:flex; flex-direction:column; gap:16px; }
    .info-card { padding:24px 28px; border-radius:20px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06); display:flex; align-items:center; gap:20px; }
    .info-icon { font-size:36px; flex-shrink:0; }
    .info-text { flex:1; font-size:20px; color:${sub}; font-weight:600; line-height:1.4; }
    .info-bar { width:120px; height:8px; border-radius:4px; background:rgba(255,255,255,0.08); flex-shrink:0; overflow:hidden; }
    .info-bar-fill { height:100%; border-radius:4px; transition:width 0.5s; }
    .bottom { padding:0 64px 56px; display:flex; justify-content:space-between; align-items:center; z-index:1; }
    .handle { font-size:17px; color:#64748b; font-weight:600; }
    .cta { font-size:16px; color:${ac}; font-weight:600; opacity:0.8; }
  </style></head><body>
    <div class="bg-pattern"></div>
    <div class="top">
      <div class="badge">🦙 ${tag}</div>
      <div class="slide-num">${slideNum}</div>
    </div>
    <div class="hero">
      <div class="hero-tag">${tag}</div>
      <div class="hero-title">${cut(title, 35)}</div>
      <div class="info-grid">${cards}</div>
    </div>
    <div class="bottom">
      <div class="handle">@ai.pacaa</div>
      <div class="cta">글에서 자세히 👇</div>
    </div>
  </body></html>`;
}

const STYLES = [styleNumberEmoji, styleAppCapture, styleInfographic];

async function generateCards({ slides = [], save = true, queueId = null } = {}) {
  if (!slides.length) return [];

  const palette = pick(slides[0].title || 'AI');
  const avatarPath = path.join(ASSETS_DIR, 'avatar_aipaca.jpg');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1080 } });

  const results = [];
  for (let i = 0; i < slides.length; i++) {
    // 슬라이드마다 다른 스타일 적용
    const styleFn = STYLES[i % STYLES.length];
    const slidePalette = PALETTES[(PALETTES.indexOf(palette) + i) % PALETTES.length];

    const html = styleFn({
      title: slides[i].title || '',
      body: slides[i].body || '',
      palette: slidePalette,
      slideIndex: i,
      totalSlides: slides.length,
      avatarPath,
    });

    await page.setContent(html, { waitUntil: 'networkidle' });

    if (save) {
      const filename = queueId ? `card_${queueId}_${i}.png` : `card_${Date.now()}_${i}.png`;
      const filepath = path.join(MEDIA_DIR, filename);
      await page.screenshot({ path: filepath, type: 'png' });
      results.push({ filename, path: filepath });
    } else {
      results.push(await page.screenshot({ type: 'png' }));
    }
  }

  await browser.close();
  return results;
}

async function generateCard({ title, body, source, type, save = true } = {}) {
  return generateCards({ slides: [{ title: title || 'AI 뉴스', body: body || '' }], save });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args[0] === '--slides' && !process.stdin.isTTY) {
    const queueId = args.includes('--queue-id') ? args[args.indexOf('--queue-id') + 1] : null;
    let data = '';
    process.stdin.on('data', c => data += c);
    process.stdin.on('end', async () => {
      try {
        const slides = JSON.parse(data);
        const results = await generateCards({ slides, save: true, queueId });
        results.forEach(r => console.log(r.path));
      } catch (e) { console.log('❌', e.message); }
    });
  } else if (args[0] === '--queue') {
    import('pg').then(({ Pool }) => {
      const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_OZ8lmEfJDg4e@ep-purple-recipe-a1l3vs4n-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' });
      pool.query("SELECT id, card_slides FROM publish_queue WHERE card_slides IS NOT NULL AND status = 'pending' ORDER BY id LIMIT 5").then(async ({ rows }) => {
        for (const row of rows) {
          try {
            const slides = JSON.parse(typeof row.card_slides === 'string' ? row.card_slides : JSON.stringify(row.card_slides));
            const results = await generateCards({ slides, save: true, queueId: row.id });
            const paths = results.map(r => r.path).join(',');
            await pool.query('UPDATE publish_queue SET media_url = $1, media_type = $2 WHERE id = $3', [paths, 'image', row.id]);
            console.log(`✅ queue#${row.id}: ${results.length}장 생성`);
          } catch (e) { console.log(`❌ queue#${row.id}: ${e.message}`); }
        }
        await pool.end();
      });
    });
  } else {
    generateCard({ title: args[0] || '테스트', body: args[1] || '' })
      .then(r => { if (r[0]?.path) console.log(r[0].path); })
      .catch(e => console.log('❌', e.message));
  }
}

export { generateCard, generateCards };
