import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/index.js';
import { pool } from '../storage/db.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { sendEmailConfirm, sendPasswordReset } from './mailService.js';

export function issueJwt(user) {
  return jwt.sign({ id: user.id, role: user.role }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
}

export async function register({ login, password, fullName, email }) {
  const passwordHash = await hashPassword(password);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [uRes] = await conn.query(
      `INSERT INTO Users (login, password_hash, full_name, email, email_confirmed, role)
       VALUES (?, ?, ?, ?, 0, 'user')`,
      [login, passwordHash, fullName, email]
    );
    const userId = uRes.insertId;

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); 

    await conn.query(
      `INSERT INTO EmailTokens (token, expires_at, user_id) VALUES (?, ?, ?)`,
      [token, new Date(expiresAt), userId]
    );

    await conn.commit();

    await sendEmailConfirm(email, token);

    return { id: userId, login, email };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function confirmEmail(token) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[found]] = await conn.query(
      `SELECT token, user_id, expires_at FROM EmailTokens WHERE token = ?`,
      [token]
    );
    if (!found || new Date(found.expires_at) < new Date()) {
      const err = new Error('Invalid or expired token'); err.status = 400; throw err;
    }

    const [[userRow]] = await conn.query(
      `SELECT id, email, role FROM Users WHERE id = ?`,
      [found.user_id]
    );

    await conn.query(`UPDATE Users SET email_confirmed = 1 WHERE id = ?`, [found.user_id]);
    await conn.query(`DELETE FROM EmailTokens WHERE token = ?`, [token]);

    await conn.commit();

    return { email: userRow?.email || null };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function login({ login, email, password }) {
  const [[user]] = await pool.query(
    `SELECT id, password_hash AS passwordHash, email_confirmed AS emailConfirmed, role
     FROM Users WHERE login = ? AND email = ?`,
    [login, email]
  );
  if (!user) { const e = new Error('Invalid credentials'); e.status = 401; throw e; }
  if (!user.emailConfirmed) { const e = new Error('Email not confirmed'); e.status = 403; throw e; }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) { const e = new Error('Invalid credentials'); e.status = 401; throw e; }
  return issueJwt({ id: user.id, role: user.role });
}

export async function logout() { return; }

export async function startPasswordReset(email) {
  const [[user]] = await pool.query(
    `SELECT id FROM Users WHERE email = ?`,
    [email]
  );
  if (!user) return;
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60);
  await pool.query(
    `INSERT INTO PasswordResetTokens (token, expires_at, user_id) VALUES (?, ?, ?)`,
    [token, expiresAt, user.id]
  );
  await sendPasswordReset(email, token);
}

export async function confirmPasswordReset(token, newPassword) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[found]] = await conn.query(
      `SELECT token, user_id, expires_at FROM PasswordResetTokens WHERE token = ?`,
      [token]
    );
    if (!found || new Date(found.expires_at) < new Date()) {
      const e = new Error('Invalid or expired token'); e.status = 400; throw e;
    }
    const newHash = await hashPassword(newPassword);
    await conn.query(`UPDATE Users SET password_hash = ? WHERE id = ?`, [newHash, found.user_id]);
    await conn.query(`DELETE FROM PasswordResetTokens WHERE token = ?`, [token]);
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
