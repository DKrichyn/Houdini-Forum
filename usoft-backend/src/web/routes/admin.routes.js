import { Router } from 'express';
import { auth, requireRole } from '../middlewares/auth.js';
import { pool } from '../../storage/db.js';

const router = Router();

router.use(auth(true), requireRole('admin'));


async function one(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows?.[0] || null;
}
async function all(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}
function bad(res, code, msg) {
  return res.status(code).json({ error: msg });
}
function toSlug(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || null;
}
function isId(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0;
}

router.get('/dashboard', async (_req, res, next) => {
  try {
    const [[{ u }]] = await pool.query('SELECT COUNT(*) u FROM Users');
    const [[{ p }]] = await pool.query('SELECT COUNT(*) p FROM Posts');
    const [[{ c }]] = await pool.query('SELECT COUNT(*) c FROM Comments');
    const [[{ cat }]] = await pool.query('SELECT COUNT(*) cat FROM Categories');
    res.json({ users: u, posts: p, comments: c, categories: cat });
  } catch (e) { next(e); }
});


router.get('/users', async (_req, res, next) => {
  try {
    const rows = await all(
      `SELECT id, login, full_name AS fullName, email, role, rating,
              email_confirmed AS emailConfirmed, avatar_url AS avatarUrl,
              created_at AS createdAt, updated_at AS updatedAt
       FROM Users
       ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/users', async (req, res, next) => {
  try {
    const { login, email, fullName, password, role = 'user' } = req.body || {};
    if (!login || !email || !fullName || !password) {
      return bad(res, 400, 'login, email, fullName, password are required');
    }
    if (!['user', 'admin'].includes(role)) {
      return bad(res, 400, 'Invalid role');
    }

    const { hashPassword } = await import('../../utils/password.js');
    const hash = await hashPassword(password);

    const [ins] = await pool.query(
      `INSERT INTO Users (login, password_hash, full_name, email, email_confirmed, role, rating)
       VALUES (?,?,?,?,1,?,0)`,
      [login, hash, fullName, email, role]
    );

    const user = await one(
      `SELECT id, login, full_name AS fullName, email, role, rating,
              email_confirmed AS emailConfirmed
       FROM Users WHERE id=?`,
      [ins.insertId]
    );
    res.status(201).json(user);
  } catch (e) { next(e); }
});

router.patch('/users/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!isId(id)) return bad(res, 400, 'Bad user id');

    const { fullName, email, role } = req.body || {};
    if (role !== undefined && !['user', 'admin'].includes(role)) {
      return bad(res, 400, 'Invalid role');
    }


    const fields = [];
    const params = [];
    if (fullName !== undefined) { fields.push('full_name=?'); params.push(fullName); }
    if (email !== undefined)    { fields.push('email=?'); params.push(email); }
    if (role !== undefined)     { fields.push('role=?'); params.push(role); }

    if (!fields.length) return bad(res, 400, 'No fields to update');

    params.push(id);
    await pool.query(`UPDATE Users SET ${fields.join(', ')} WHERE id=?`, params);

    const user = await one(
      `SELECT id, login, full_name AS fullName, email, role, rating,
              email_confirmed AS emailConfirmed, avatar_url AS avatarUrl,
              created_at AS createdAt, updated_at AS updatedAt
       FROM Users WHERE id=?`,
      [id]
    );
    if (!user) return bad(res, 404, 'User not found');
    res.json(user);
  } catch (e) { next(e); }
});

router.delete('/users/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!isId(id)) return bad(res, 400, 'Bad user id');

    await pool.query(`DELETE FROM Users WHERE id=?`, [id]);
    res.status(204).send();
  } catch (e) { next(e); }
});


router.get('/categories', async (_req, res, next) => {
  try {
    const rows = await all(
      `SELECT id, title, description, slug, created_at AS createdAt, updated_at AS updatedAt
       FROM Categories
       ORDER BY title ASC`
    );
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/categories', async (req, res, next) => {
  try {
    const { title, description } = req.body || {};
    if (!title) return bad(res, 400, 'title is required');
    const slug = toSlug(title);

    const [ins] = await pool.query(
      `INSERT INTO Categories (title, description, slug) VALUES (?,?,?)`,
      [title, description ?? null, slug]
    );
    const cat = await one(
      `SELECT id, title, description, slug, created_at AS createdAt
       FROM Categories WHERE id=?`,
      [ins.insertId]
    );
    res.status(201).json(cat);
  } catch (e) { next(e); }
});

router.patch('/categories/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!isId(id)) return bad(res, 400, 'Bad category id');

    const { title, description } = req.body || {};
    const fields = [];
    const params = [];
    if (title !== undefined) { fields.push('title=?'); params.push(title); }
    if (description !== undefined) { fields.push('description=?'); params.push(description); }
    if (title !== undefined) { fields.push('slug=?'); params.push(toSlug(title)); }

    if (!fields.length) return bad(res, 400, 'No fields to update');

    params.push(id);
    await pool.query(`UPDATE Categories SET ${fields.join(', ')} WHERE id=?`, params);

    const cat = await one(
      `SELECT id, title, description, slug, created_at AS createdAt, updated_at AS updatedAt
       FROM Categories WHERE id=?`,
      [id]
    );
    if (!cat) return bad(res, 404, 'Category not found');
    res.json(cat);
  } catch (e) { next(e); }
});

router.delete('/categories/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!isId(id)) return bad(res, 400, 'Bad category id');

    await pool.query(`DELETE FROM Categories WHERE id=?`, [id]);
    res.status(204).send();
  } catch (e) { next(e); }
});

router.get('/posts', async (_req, res, next) => {
  try {
    const rows = await all(
      `SELECT p.id, p.title, p.content, p.status, p.likes_count AS likesCount, p.dislikes_count AS dislikesCount,
              p.created_at AS createdAt, p.updated_at AS updatedAt,
              u.login AS authorLogin, u.id AS authorId
       FROM Posts p
       JOIN Users u ON u.id = p.author_id
       ORDER BY p.created_at DESC`
    );
    res.json(rows);
  } catch (e) { next(e); }
});

router.patch('/posts/:id/status', async (req, res, next) => {
  try {
    const id = req.params.id;
    const { status } = req.body || {};
    if (!isId(id)) return bad(res, 400, 'Bad post id');
    if (!['active', 'inactive'].includes(status)) return bad(res, 400, 'Bad status');

    await pool.query(`UPDATE Posts SET status=? WHERE id=?`, [status, id]);
    const post = await one(
      `SELECT id, title, status, likes_count AS likesCount, dislikes_count AS dislikesCount,
              created_at AS createdAt, updated_at AS updatedAt
       FROM Posts WHERE id=?`,
      [id]
    );
    if (!post) return bad(res, 404, 'Post not found');
    res.json(post);
  } catch (e) { next(e); }
});

router.delete('/posts/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!isId(id)) return bad(res, 400, 'Bad post id');

    await pool.query(`DELETE FROM Posts WHERE id=?`, [id]);
    res.status(204).send();
  } catch (e) { next(e); }
});

router.get('/comments', async (_req, res, next) => {
  try {
    const rows = await all(
      `SELECT c.id, c.post_id AS postId, c.author_id AS authorId, c.content,
              c.status, c.likes_count AS likesCount, c.dislikes_count AS dislikesCount,
              c.created_at AS createdAt, c.updated_at AS updatedAt,
              u.login AS authorLogin, p.title AS postTitle
       FROM Comments c
       JOIN Users u ON u.id = c.author_id
       JOIN Posts p ON p.id = c.post_id
       ORDER BY c.created_at DESC`
    );
    res.json(rows);
  } catch (e) { next(e); }
});

router.patch('/comments/:id/status', async (req, res, next) => {
  try {
    const id = req.params.id;
    const { status } = req.body || {};
    if (!isId(id)) return bad(res, 400, 'Bad comment id');
    if (!['active', 'inactive'].includes(status)) return bad(res, 400, 'Bad status');

    await pool.query(`UPDATE Comments SET status=? WHERE id=?`, [status, id]);
    const c = await one(
      `SELECT id, post_id AS postId, author_id AS authorId, content,
              status, likes_count AS likesCount, dislikes_count AS dislikesCount,
              created_at AS createdAt, updated_at AS updatedAt
       FROM Comments WHERE id=?`,
      [id]
    );
    if (!c) return bad(res, 404, 'Comment not found');
    res.json(c);
  } catch (e) { next(e); }
});

router.delete('/comments/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!isId(id)) return bad(res, 400, 'Bad comment id');

    await pool.query(`DELETE FROM Comments WHERE id=?`, [id]);
    res.status(204).send();
  } catch (e) { next(e); }
});

export default router;
