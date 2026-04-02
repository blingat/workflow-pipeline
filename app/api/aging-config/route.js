import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_OZ8lmEfJDg4e@ep-purple-recipe-a1l3vs4n-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' });

// 에이징 설정은 DB가 아니라 JSON 파일로 관리 (aging.js가 읽음)
const CONFIG_FILE = '/home/kkk/.openclaw/workspace/workflow-pipeline/.aging_config.json';

const DEFAULTS = {
  max_likes: 15,
  max_follows: 5,
  max_reposts: 3,
  max_comments: 3,
  max_duration: 25,
  targets: [
    '@specal1849', '@geumverse_ai', '@realaiforyou', '@gpt_park',
    '@rosy_.designer', '@jaykimuniverse', '@dev.haesummy', '@aitrendmaster',
    '@latinus_us', '@dev_shibaa',
  ],
  comment_style: 'casual', // casual, witty, expert
  schedule_enabled: false,
  schedule_hours: '09,15,21',
};

function readConfig() {
  try {
    const fs = require('fs');
    return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')) };
  } catch { return DEFAULTS; }
}

function writeConfig(data) {
  const fs = require('fs');
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));
}

export async function GET() {
  const config = readConfig();
  return NextResponse.json(config);
}

export async function PUT(request) {
  const body = await request.json();
  const current = readConfig();
  const updated = { ...current, ...body };
  writeConfig(updated);
  return NextResponse.json({ ok: true, config: updated });
}
