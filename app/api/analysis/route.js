import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const rows = await query('SELECT * FROM analysis_results ORDER BY analyzed_at DESC LIMIT 100');
    return NextResponse.json(rows);
  } catch { return NextResponse.json([]); }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const rows = await query(
      `INSERT INTO analysis_results (post_id, content_type, hooking_pattern, counter_angle, suggested_prompt, trend_keywords)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [body.post_id, body.content_type, body.hooking_pattern, body.counter_angle, body.suggested_prompt, body.trend_keywords || []]
    );
    return NextResponse.json(rows[0]);
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
