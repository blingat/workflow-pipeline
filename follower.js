#!/usr/bin/env node
// follower.js — 5단계: GQL API로 팔로우 (DOM 클릭 없음)
const fs = require('fs');
const path = require('path');
const { jitter, sleep, humanDelay } = require('./stealth_utils');
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

const VISITED_FILE = path.join(__dirname, '.aging_visited.json');
const FOLLOWS_FILE = path.join(__dirname, '.aging_recent_follows.json');

function loadVisited() {
  try { return JSON.parse(fs.readFileSync(VISITED_FILE, 'utf-8')); } catch { return {}; }
}
function saveVisited(data) {
  fs.writeFileSync(VISITED_FILE, JSON.stringify(data, null, 2));
}
function loadFollows() {
  try { return JSON.parse(fs.readFileSync(FOLLOWS_FILE, 'utf-8')); } catch { return { follows: [] }; }
}
function saveFollows(data) {
  fs.writeFileSync(FOLLOWS_FILE, JSON.stringify(data, null, 2));
}

// GQL로 user_id 조회
async function getUserId(page, username) {
  try {
    const resp = await page.evaluate(async (user) => {
      const r = await fetch('/api/v1/user_profile/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `username=${encodeURIComponent(user)}`
      });
      return await r.json();
    }, username);
    return resp?.data?.user?.pk || null;
  } catch {
    return null;
  }
}

// GQL follow/unfollow
async function gqlFollow(page, userId, action = 'follow') {
  try {
    const result = await page.evaluate(async ({ userId, action }) => {
      const fbdt = document.cookie.split(';').find(c => c.trim().startsWith('ds_user_id='));
      const dsUserId = fbdt ? fbdt.split('=')[1] : '';
      
      // fb_dtsg 토큰 추출
      const scripts = document.querySelectorAll('script');
      let fbDtsg = '';
      for (const s of scripts) {
        const m = s.textContent.match(/"token":"([^"]+)"/);
        if (m) { fbDtsg = m[1]; break; }
      }

      const variables = JSON.stringify({
        target_user_id: userId,
        __relay_internal__: {__args: {is_verified: false}}
      });

      const r = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-IG-App-ID': '238260069307367',
          'X-FB-LSD': fbDtsg || '',
        },
        body: `fb_api_req_friendly_name=FollowButton_${action === 'follow' ? 'follow' : 'unfollow'}&doc_id=6736213580146946&variables=${encodeURIComponent(variables)}`
      });
      return await r.json();
    }, { userId, action });

    const status = result?.data?.socialgraph_mutate_follow?.follow_status;
    return status === 'FOLLOWING' || status === 'follow';
  } catch (e) {
    return false;
  }
}

async function followNew(page, candidates, { maxFollows = 5 } = {}) {
  const results = [];
  const visited = loadVisited();
  const followsData = loadFollows();
  const today = new Date().toISOString().split('T')[0];
  if (!visited[today]) visited[today] = [];
  const alreadyFollowed = new Set(followsData.follows.slice(-50).map(f => f.target));
  const todayVisited = new Set(visited[today]);

  // 필터링
  const available = candidates.authors.filter(a =>
    !alreadyFollowed.has(`@${a.username}`) && !todayVisited.has(a.username)
  ).sort(() => Math.random() - 0.5).slice(0, maxFollows * 2);

  console.log(`✅ 팔로우 시작 (후보: ${available.length}명, 목표: ${maxFollows}명) [GQL]`);

  for (const { username } of available) {
    if (results.length >= maxFollows) break;
    if (Math.random() > 0.40) continue;

    try {
      await sleep(rand(4000, 8000));
      if (Math.random() < 0.2) await sleep(rand(15000, 25000));

      // user_id 조회 (DOM 이동 없이 API)
      const userId = await getUserId(page, username);
      if (!userId) {
        console.log(`   ⏭️ @${username}: ID 조회 실패`);
        visited[today].push(username);
        continue;
      }

      // GQL 팔로우
      const ok = await gqlFollow(page, userId);
      await sleep(rand(3000, 5000));

      if (ok) {
        results.push({ target: `@${username}`, ui: '✅GQL' });
        visited[today].push(username);
        followsData.follows.push({ target: `@${username}`, ts: new Date().toISOString() });
        followsData.follows = followsData.follows.slice(-50);
        console.log(`   ✅ 팔로우 #${results.length} → @${username} [GQL]`);
      } else {
        console.log(`   ⚠️ @${username}: 팔로우 실패`);
      }

      await sleep(rand(4000, 8000));
    } catch (e) {
      console.log(`   ❌ @${username}: ${e.message.substring(0, 40)}`);
      await sleep(2000);
    }
  }

  saveVisited(visited);
  saveFollows(followsData);
  console.log(`   완료: ${results.length}개 신규 팔로우`);
  return results;
}

module.exports = { followNew };
