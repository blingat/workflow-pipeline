import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET() {
  try {
    const { rows } = await pool.query(
      `SELECT id, started_at, ended_at, duration_sec, collected, hooked, evaluated, failed, queued, status
       FROM pipeline_logs ORDER BY started_at DESC LIMIT 30`
    );
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
