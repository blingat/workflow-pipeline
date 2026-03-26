import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const rows = await query("SELECT * FROM collector_config ORDER BY id ASC");
    return NextResponse.json(rows.length ? rows : []);
  } catch { return NextResponse.json([]); }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    // Upsert: delete all, re-insert
    await query("DELETE FROM collector_config");
    for (const item of body) {
      await query(
        `INSERT INTO collector_config (keyword, max_posts, enabled) VALUES ($1, $2, $3)`,
        [item.keyword, item.max_posts || 20, item.enabled !== false]
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
