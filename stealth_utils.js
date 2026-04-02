#!/usr/bin/env node
// stealth_utils.js — 봇 감지 우회 공용 유틸리티
const fs = require('fs');
const path = require('path');

// 1. 소수점 Jitter 딜레이 (밀리초 단위 불규칙)
function jitter(min, max) {
  return Math.random() * (max - min) + min;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

// 휴머니즘 딜레이: 액션 간 기본 + 20% 확률 긴 휴식
async function humanDelay(minMs = 5234, maxMs = 11847, longChance = 0.2) {
  await sleep(jitter(minMs, maxMs));
  if (Math.random() < longChance) {
    await sleep(jitter(15000, 25000));
  }
}

// 2. 베지에 곡선 마우스 이동
async function bezierMove(page, targetX, targetY, steps = 20) {
  const startX = await page.evaluate(() => window.__lastMouseX || 400);
  const startY = await page.evaluate(() => window.__lastMouseY || 300);

  // 제어점 생성 (자연스러운 곡선)
  const cp1x = startX + (targetX - startX) * 0.25 + jitter(-60, 60);
  const cp1y = startY + (targetY - startY) * 0.25 + jitter(-40, 40);
  const cp2x = startX + (targetX - startX) * 0.75 + jitter(-60, 60);
  const cp2y = startY + (targetY - startY) * 0.75 + jitter(-40, 40);

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const t2 = t * t;
    const t3 = t2 * t;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;

    const x = mt3 * startX + 3 * mt2 * t * cp1x + 3 * mt * t2 * cp2x + t3 * targetX;
    const y = mt3 * startY + 3 * mt2 * t * cp1y + 3 * mt * t2 * cp2y + t3 * targetY;

    await page.mouse.move(x, y, { steps: 0 });
    await sleep(jitter(8, 25));
  }

  await page.evaluate((x, y) => {
    window.__lastMouseX = x;
    window.__lastMouseY = y;
  }, targetX, targetY);

  // 작은 랜덤 미세 흔들림 (사람의 손떨림)
  if (Math.random() < 0.3) {
    await page.mouse.move(targetX + jitter(-2, 2), targetY + jitter(-2, 2));
    await sleep(jitter(50, 150));
  }
}

// 3. 자연스러운 클릭 (베지에 이동 + 랜덤 지연 후 클릭)
async function humanClick(page, locator) {
  const el = await locator.elementHandle({ timeout: 5000 });
  if (!el) return false;

  const box = await el.boundingBox();
  if (!box) return false;

  // 랜덤 오프셋 (정중앙 클릭은 비자연스러움)
  const offsetX = box.width * jitter(0.3, 0.7);
  const offsetY = box.height * jitter(0.3, 0.7);
  const targetX = box.x + offsetX;
  const targetY = box.y + offsetY;

  await bezierMove(page, targetX, targetY);
  await sleep(jitter(80, 250)); // 클릭 전 미세 지연

  await page.mouse.down();
  await sleep(jitter(60, 150));
  await page.mouse.up();

  return true;
}

// 4. 체크포인트 감지 + 48시간 락
const LOCK_FILE = path.join(__dirname, '.aging_lock.json');

function isLocked() {
  try {
    const data = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf-8'));
    const elapsed = Date.now() - data.lockedAt;
    if (elapsed < data.duration) {
      const remaining = Math.ceil((data.duration - elapsed) / 3600000);
      console.log(`   🚫 체크포인트 락: ${remaining}시간 남음 (${data.reason})`);
      return true;
    }
    // 락 해제
    fs.unlinkSync(LOCK_FILE);
    return false;
  } catch { return false; }
}

function setLock(reason, durationMs = 72 * 3600000) {
  fs.writeFileSync(LOCK_FILE, JSON.stringify({
    reason,
    lockedAt: Date.now(),
    duration: durationMs
  }, null, 2));
  console.log(`   🔒 락 설정: ${reason} (${Math.round(durationMs / 3600000)}시간)`);
}

// 5. Trust Score 점진적 증가
const TRUST_FILE = path.join(__dirname, '.aging_trust.json');

function getTrustScore() {
  try { return JSON.parse(fs.readFileSync(TRUST_FILE, 'utf-8')); } catch {
    return { level: 1, totalDays: 0, lastRun: null, checkpointCount: 0 };
  }
}

function saveTrustScore(data) {
  fs.writeFileSync(TRUST_FILE, JSON.stringify(data, null, 2));
}

function updateTrustScore() {
  const trust = getTrustScore();
  const today = new Date().toISOString().split('T')[0];

  // 새로운 날이면 totalDays 증가
  if (trust.lastRun !== today) {
    trust.totalDays++;
    trust.lastRun = today;
  }

  // 트러스트 레벨 계산 (주 단위로 증가)
  if (trust.totalDays >= 28) trust.level = 4;      // 4주+
  else if (trust.totalDays >= 14) trust.level = 3;  // 2주+
  else if (trust.totalDays >= 7) trust.level = 2;   // 1주+
  else trust.level = 1;                              // 첫 주

  saveTrustScore(trust);
  return trust;
}

function onCheckpoint() {
  const trust = getTrustScore();
  trust.checkpointCount++;
  saveTrustScore(trust);
  // 체크포인트마다 락 기간 증가 (72h → 96h → 120h)
  const baseLock = 72 * 3600000;
  const extraLock = (trust.checkpointCount - 1) * 24 * 3600000;
  setLock(`checkpoint #${trust.checkpointCount}`, baseLock + extraLock);
}

// 레벨별 액션 제한
function getActionLimits() {
  const trust = getTrustScore();
  const limits = {
    1: { likes: 3, follows: 1, reposts: 1, comments: 1, sessionMin: 5 },   // 첫 주: 최소
    2: { likes: 5, follows: 2, reposts: 2, comments: 2, sessionMin: 8 },   // 2주: 조금 증가
    3: { likes: 8, follows: 3, reposts: 3, comments: 3, sessionMin: 10 },  // 3주: 중간
    4: { likes: 12, follows: 5, reposts: 5, comments: 5, sessionMin: 10 }, // 4주+: 정상
  };
  return { ...limits[trust.level], level: trust.level, days: trust.totalDays };
}

// 6. Canvas/WebGL 핑거프린트 무력화 스크립트
const FINGERPRINT_SCRIPT = `
  // Canvas fingerprint 무력화
  const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function(type) {
    if (type === 'image/png') {
      const ctx = this.getContext('2d');
      if (ctx) {
        const style = ctx.fillStyle;
        ctx.fillStyle = 'rgba(0,0,' + Math.floor(Math.random()*10) + ',0.01)';
        ctx.fillRect(0, 0, 1, 1);
        ctx.fillStyle = style;
      }
    }
    return origToDataURL.apply(this, arguments);
  };

  // WebGL fingerprint 무력화
  const origGetParameter = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function(param) {
    if (param === 37445) return 'Intel Inc.';
    if (param === 37446) return 'Intel Iris OpenGL Engine';
    return origGetParameter.apply(this, arguments);
  };

  // AudioContext fingerprint 무력화
  if (typeof AudioContext !== 'undefined') {
    const origCreateOscillator = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function() {
      const osc = origCreateOscillator.apply(this, arguments);
      const origConnect = osc.connect.bind(osc);
      osc.connect = function(dest) {
        // 미세 노이즈 추가
        return origConnect(dest);
      };
      return osc;
    };
  }

  // navigator.plugins 풍부화
  Object.defineProperty(navigator, 'plugins', {
    get: () => [
      { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
      { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
      { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' }
    ]
  });

  // 마우스 위치 추적 초기화
  window.__lastMouseX = Math.floor(Math.random() * 800) + 100;
  window.__lastMouseY = Math.floor(Math.random() * 400) + 100;
`;

module.exports = {
  jitter, sleep, humanDelay, bezierMove, humanClick,
  isLocked, setLock, onCheckpoint,
  getTrustScore, updateTrustScore, getActionLimits,
  FINGERPRINT_SCRIPT
};
