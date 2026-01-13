import mysql from 'mysql2/promise';

const {
  DB_HOST,
  DB_PORT,
  DB_NAME,
  DB_USER,
  DB_PASS
} = process.env;

export const pool = mysql.createPool({
  host: DB_HOST,
  port: Number(DB_PORT || 3306),
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
  timezone: 'Z' 
});

export async function execMany(sql) {
  const conn = await pool.getConnection();
  try {
    const statements = sql
      .split(/;[\r\n]+/g)
      .map(s => s.trim())
      .filter(Boolean);
    for (const s of statements) {
      await conn.query(s);
    }
  } finally {
    conn.release();
  }
}
