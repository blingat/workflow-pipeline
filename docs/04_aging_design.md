# AI파카 에이징 설계안 v4

## 실행 조건
- **주기:** 매일 1회, 한국시간 10:00~11:00 사이 랜덤
- **시간:** 20~25분 이내 완료
- **계정:** ai.pacaa
- **환경:** Ubuntu 서버 + Xvfb(:5901) + Stealth + **프록시 없음 (KT 서울 IP 직결)**
- **인증:** VNC에서 수동 로그인 1회 → Chrome User Data 영속화 (쿠키 만료 시 재로그인)

---

## 1. 인증 상태 영속화

### 로그인 방식
- **최초 1회:** VNC 서버에서 사람이 직접 Chrome으로 Instagram/Threads 로그인
- **이후:** Playwright가 동일 User Data 폴더 사용
- **쿠키 만료 시:** Telegram 알림 → VNC에서 재로그인

### User Data 경로
```
/home/kkk/.config/google-chrome-for-testing/
```

### 절대 금지
- ❌ 스크립트로 자동 로그인 시도 (Meta가 봇으로 판별 → 쓰기 권한 없음)
- ❌ 프록시 사용 (IP 점프 → 섀도우 밴)
- ❌ headless:true (CDP 감지)

---

## 2. React 18 클릭 해결 (v4 신규)

### 문제
Threads는 React 18 기반. Playwright의 `element.click({force:true})`는 React Synthetic Event를 트리거하지 못함 → UI 컴포넌트 렌더링 안 됨 (GitHub #28595).

### 해결: dispatchEvent 체인
```javascript
const reactClick = async (page, locator) => {
  const el = await locator.elementHandle({ timeout: 3000 });
  await page.evaluate(el => {
    const rect = el.getBoundingClientRect();
    const x = rect.x + rect.width / 2;
    const y = rect.y + rect.height / 2;
    const opts = { bubbles: true, cancelable: true, clientX: x, clientY: y,
                   pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1 };
    el.dispatchEvent(new PointerEvent('pointerdown', opts));
    el.dispatchEvent(new PointerEvent('pointerup', { ...opts, button: 0, buttons: 0 }));
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));
  }, el);
};
```

### SVG 기반 선택자
버튼에 aria-label이 없고 SVG에 있음. 하단 고정 바(y좌표 최대) 선택:
```javascript
const svgClickBottom = async (page, ariaLabel) => {
  // 같은 aria-label의 SVG 중 y좌표 가장 큰 것 선택
  const svgs = page.locator(`svg[aria-label="${ariaLabel}"]`);
  // ... maxY 기준 선택 후 reactClick
};
```

| 요소 | SVG aria-label |
|------|---------------|
| 좋아요 | `좋아요` (안 한 상태) / `좋아요 취소` (이미 한 상태) |
| 답글 | `답글` |
| 리포스트 | `리포스트` |
| 공유 | `공유하기` |

---

## 3. 중복 방지 (v4 강화)

### 게시물 중복
```javascript
const processedPostIds = new Set();
const postId = postUrl.match(/\/post\/([a-zA-Z0-9_-]+)/)?.[1];
if (processedPostIds.has(postId)) continue;
processedPostIds.add(postId);
```

### ⭐ 사용자 중복 (v4 신규)
```javascript
const likedUsers = new Set();    // 좋아요한 사용자
const repostedUsers = new Set(); // 리포스트한 사용자
const commentedUsers = new Set();// 댓글 단 사용자

// 좋아요 전: 같은 사람 2회 이상 금지
if (likedUsers.has(target)) continue;
likedUsers.add(target);
```

**규칙:**
- 같은 사용자에게 좋아요 1회만 (여러 글 있어도 1개만)
- 같은 사용자에게 리포스트 1회만
- 같은 사용자에게 댓글 1회만
- 팔로우: 이미 팔로잉이면 스킵 (카운트 X)
- **팔로우는 한국어 UI(`팔로우` 버튼)만** — 영어 UI 계정은 팔로우 시도 안 함

---

## 4. 댓글 — GLM-5-Turbo 동적 생성

### API
- **엔드포인트:** `https://api.z.ai/api/coding/paas/v4/chat/completions` (Coding Plan 전용)
- **모델:** `glm-5-turbo`
- **API Key:** TOOLS.md 참고

### 프롬프트 (영어 작성 필수)
```
You are a Korean alpaca account. Reply in Korean casual speech (banmal),
under 30 chars, 1 emoji at end. Output ONLY the comment text, nothing else.

Post: {postText}
```

### reasoning_content fallback
content가 비어있으면 reasoning_content에서 마지막 한국어 초안 추출.

### 댓글 후 좋아요
댓글 단 글에도 좋아요 누르기 (이미 좋아요 상태면 스킵).

---

## 5. 프록시 — 사용 안 함

- 서버 IP: KT 서울 IP (최상급 통신사 IP)
- ❌ 프록시 경유 금지

---

## 6. 마우스 — 스크롤 Overshoot만

스크롤 시 15% 확률로 의도적으로 넘겼다가 돌아오기:
```javascript
if (Math.random() < 0.15) {
  await page.evaluate(y => window.scrollBy(0, y), rand(500, 800));
  await sleep(rand(800, 1500));
  await page.evaluate(y => window.scrollBy(0, -y), rand(200, 400));
  await sleep(rand(500, 1000));
}
```

---

## 7. 일일 목표

| 액션 | 수량 | 규칙 |
|------|------|------|
| ❤️ 좋아요 | 10~15개 | **1사용자당 1개만** |
| ✅ 팔로우 | 5개 신규 | 한국어 UI만, 이미 팔로잉=스킵(카운트X) |
| 🔄 리포스트 | 2~3개 | **1사용자당 1개만** |
| 💬 댓글 | 2~3개 | **1사용자당 1개만**, GLM 동적 생성 |
| ❤️ 댓글글+좋아요 | 자동 | 댓글 단 글에 좋아요 |
| 📝 발행 | 0개 | 에이징 기간 미발행 |

---

## 8. 타겟 풀

### 메인 타겟 (10개)
```
@specal1849, @geumverse_ai, @realaiforyou, @gpt_park,
@rosy_.designer, @jaykimuniverse, @dev.haesummy, @aitrendmaster,
@latinus_us, @dev_shibaa
```

### 팔로우 추가 타겟 (10개)
```
@itsshibaai, @aichannel_kr, @ai_tool_master, @prompt_engineer_kr,
@chatgpt_korea, @aistartup_kr, @dailyai_kr, @ai_product_kr,
@nocode_ai_kr, @automation_kr
```

---

## 9. 검증 & 리포트

### GraphQL 응답 모니터링
모든 쓰기 액션 시 GraphQL 응답 인터셉트:
- **200:** ✅ 서버 반영 확인
- **403:** ❌ 권한 없음
- **응답 없음:** ⚠️ 클라이언트 액션만 성공

### 완료 후 Telegram 알림
```
🦙 AI파카 에이징 완료 (10분 20초)

❤️ 좋아요: 14개 ✅ (1인1회 적용)
✅ 팔로우: 0개 신규 (전부 이미 팔로잉)
🔄 리포스트: 2개 ✅
💬 댓글: 2개 ✅
  - @aitrendmaster: "앗 나도 봇 아니거든?! 🦙"
  - @aitrendmaster: "봇으로 찍힘? 메메 🦙"
❌ 실패: 0개
```

### 로그 파일
- `/tmp/aging_v7.log` — 실시간 로그
- `/tmp/aging_result.json` — 최종 결과 JSON

---

## v3 → v4 변경사항
1. **React 18 클릭 해결:** `dispatchEvent` 체인 + SVG `aria-label` 선택자
2. **사용자 중복 방지:** 1사용자당 좋아요/리포스트/댓글 각각 1회만
3. **GLM API 변경:** DeepSeek(만료) → z.ai Coding Plan (`api/coding/paas/v4`)
4. **댓글 프롬프트:** 한국어 → 영어 (reasoning 모델 호환)
5. **팔로우 규칙:** 한국어 UI만 대상, 이미 팔로잉 카운트 제외
6. **댓글 후 좋아요:** 댓글 단 글에도 자동 좋아요
7. **Bezier 곡선 제거:** dispatchEvent 방식에서 불필요
