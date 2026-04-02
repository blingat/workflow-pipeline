import { NextResponse } from 'next/server';
const { Pool } = require('pg');

const DB_URL = process.env.DATABASE_URL;

export async function POST(req) {
  try {
    const { persona_id } = await req.json();

    // DB에서 페르소나 프롬프트 조회
    let basePrompt = '';
    let personaName = '';
    if (DB_URL) {
      const pool = new Pool({ connectionString: DB_URL });
      const { rows } = await pool.query('SELECT name, base_prompt FROM personas WHERE id = $1', [persona_id]);
      await pool.end();
      if (rows.length > 0) {
        personaName = rows[0].name;
        basePrompt = rows[0].base_prompt || '';
      }
    }

    if (!basePrompt) {
      return NextResponse.json({ samples: ['페르소나 프롬프트가 설정되지 않았습니다. Personas 페이지에서 설정해주세요.'] });
    }

    // 프롬프트 미리보기 (실제 LLM 호출 없이 프롬프트 구조 보여주기)
    const samples = [
      `[${personaName} 프롬프트 미리보기]`,
      basePrompt.substring(0, 200) + (basePrompt.length > 200 ? '...' : ''),
      `✅ DB 연결됨 — 발행 시 이 프롬프트로 콘텐츠가 생성됩니다`,
    ];

    return NextResponse.json({ samples, personaName });
  } catch (e) {
    return NextResponse.json({ samples: ['프리뷰 생성 실패: ' + e.message] });
  }
}
