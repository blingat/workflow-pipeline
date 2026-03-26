import { neon } from '@neondatabase/serverless';

let sql;
try {
  sql = neon(process.env.DATABASE_URL);
} catch {
  sql = null;
}

export async function query(text, params = []) {
  if (!sql) return { rows: [], rowCount: 0 };
  return sql(text, params);
}

export function isDbConnected() {
  return !!sql;
}
