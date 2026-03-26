-- threads-pipeline DB Schema for Neon PostgreSQL

-- 1. 수집 게시물
CREATE TABLE IF NOT EXISTS collected_posts (
  id SERIAL PRIMARY KEY,
  post_id VARCHAR UNIQUE,
  author VARCHAR,
  content TEXT,
  likes INT DEFAULT 0,
  reposts INT DEFAULT 0,
  replies INT DEFAULT 0,
  views INT DEFAULT 0,
  engagement_score FLOAT,
  hashtags TEXT[],
  created_at TIMESTAMP,
  collected_at TIMESTAMP DEFAULT NOW()
);

-- 2. 분석 결과
CREATE TABLE IF NOT EXISTS analysis_results (
  id SERIAL PRIMARY KEY,
  post_id VARCHAR REFERENCES collected_posts(post_id),
  content_type VARCHAR, -- traffic / insight / counter / trend
  hooking_pattern TEXT,
  counter_angle TEXT,
  suggested_prompt TEXT,
  trend_keywords TEXT[],
  analyzed_at TIMESTAMP DEFAULT NOW()
);

-- 3. 발행 대기열
CREATE TABLE IF NOT EXISTS publish_queue (
  id SERIAL PRIMARY KEY,
  persona_id VARCHAR,
  content TEXT,
  status VARCHAR DEFAULT 'pending', -- pending / approved / published / failed / viral
  scheduled_at TIMESTAMP,
  published_at TIMESTAMP,
  account VARCHAR, -- main / sub1 / sub2
  engagement_after JSONB -- {views, likes, reposts, replies}
);

-- 4. 페르소나
CREATE TABLE IF NOT EXISTS personas (
  id VARCHAR PRIMARY KEY,
  name VARCHAR,
  version VARCHAR DEFAULT '1.0.0',
  tone TEXT,
  emoji_usage VARCHAR, -- minimal / moderate / heavy
  content_length VARCHAR,
  base_prompt TEXT,
  target_audience TEXT,
  linked_account VARCHAR, -- main / sub1 / sub2
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. 키워드 트렌드
CREATE TABLE IF NOT EXISTS keyword_trends (
  id SERIAL PRIMARY KEY,
  keyword VARCHAR,
  date DATE,
  mention_count INT,
  growth_rate FLOAT,
  is_new BOOLEAN DEFAULT FALSE,
  category VARCHAR -- tech / saas / marketing / business / other
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_collected_posts_score ON collected_posts(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_collected_posts_collected ON collected_posts(collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_results_post ON analysis_results(post_id);
CREATE INDEX IF NOT EXISTS idx_publish_queue_status ON publish_queue(status);
CREATE INDEX IF NOT EXISTS idx_publish_queue_scheduled ON publish_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_keyword_trends_date ON keyword_trends(date DESC);
CREATE INDEX IF NOT EXISTS idx_keyword_trends_growth ON keyword_trends(growth_rate DESC);

-- 시드 데이터: 페르소나 3개
INSERT INTO personas (id, name, version, tone, emoji_usage, content_length, base_prompt, target_audience, linked_account) VALUES
('persona_a', '빠코더 전문가', '1.0.0', '결과물로 증명하는 간결한 전문가', 'minimal', '3~5줄',
 '당신은 AI를 활용해 실제 결과물을 내는 전문 개발자입니다.

## 규칙
- 결과물과 수치로만 증명합니다
- "바이브코딩"이라는 단어를 절대 사용하지 않습니다
- 고객 타겟 키워드를 사용합니다: "병원 홈페이지", "쇼핑몰 상세페이지", "CRM 자동화"
- 간결하고 자신감 있게, 3~5줄 이내

## 금지
- 이모지 남발, 개발 용어 남발, 허세',
 '자영업자, 스타트업, 외주 의뢰인', 'main'),

('persona_b', '테크 꿀팁봇', '1.0.0', '가볍고 자극적, 어그로', 'heavy', '2~4줄',
 '당신은 IT/AI 꿀팁을 공유하는 익명 계정입니다.

## 규칙
- 짧고 강렬하게, 2~4줄
- 첫 줄에서 시선을 끌어야 합니다 (질문, 도발, 수치)
- 이모지 적극 사용
- 리포스트 욕구를 자극하는 체크리스트/꿀팁 형태 선호

## 금지
- 길게 쓰기, 전문 용어 남발',
 'IT 관심 일반인, 개발 입문자', 'sub1'),

('persona_c', '자영업 도우미', '1.0.0', '친근하고 체크리스트형', 'moderate', '5~10줄',
 '당신은 자영업자의 디지털전환을 돕는 전문가입니다.

## 규칙
- 체크리스트/나열형으로 작성
- 번호+키워드 형식
- 친근하고 쉬운 언어
- "무료 진단", "체크리스트", "이것만 하면" 같은 리드 자석 표현 사용
- 5~10줄

## 금지
- 기술 용어, 영어 남발',
 '자영업자, 소상공인', 'sub2')
ON CONFLICT (id) DO NOTHING;
