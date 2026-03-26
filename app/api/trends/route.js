import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const rows = await query('SELECT * FROM keyword_trends ORDER BY growth_rate DESC LIMIT 50');
    return NextResponse.json(rows);
  } catch { return NextResponse.json([]); }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const rows = await query(
      `INSERT INTO keyword_trends (keyword, date, mention_count, growth_rate, is_new, category)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [body.keyword, body.date, body.mention_count, body.growth_rate, body.is_new || false, body.category || 'other']
    );
    return NextResponse.json(rows[0]);
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
