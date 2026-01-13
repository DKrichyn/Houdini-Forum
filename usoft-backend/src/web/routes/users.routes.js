
import { Router } from 'express';
import { auth, requireRole } from '../middlewares/auth.js';
import { uploadAvatar } from '../middlewares/upload.js';
import { validate } from '../middlewares/validate.js';
import { userCreateSchema, userUpdateSchema } from '../../utils/validationSchemas.js';
import { pool } from '../../storage/db.js';

const router = Router();

function getAuthedUserIdOr401(req, res) {
  const id = Number(req.user?.id);
  if (!req.user || Number.isNaN(id) || id <= 0) {
    res.status(401).json({ error: 'Invalid token payload' });
    return null;
  }
  return id;
}

router.patch('/avatar', auth(true), uploadAvatar, async (req, res, next) => {
  try {
    const myId = getAuthedUserIdOr401(req, res);
    if (myId == null) return;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await pool.query(`UPDATE Users SET avatar_url=? WHERE id=?`, [avatarUrl, myId]);
    res.json({ avatarUrl });
  } catch (e) { next(e); }
});

router.get('/', auth(false), async (_req, res, next) => {
  try {
    const [users] = await pool.query(
      `SELECT id, login, full_name AS fullName, email, email_confirmed AS emailConfirmed,
              avatar_url AS avatarUrl, role, rating, created_at AS createdAt, updated_at AS updatedAt
       FROM Users ORDER BY created_at DESC`
    );
    res.json(users);
  } catch (e) { next(e); }
});

router.get('/:id', auth(false), async (req, res, next) => {
  try {
    const pathId = Number(req.params.id);
    if (Number.isNaN(pathId) || pathId <= 0) {
      return res.status(400).json({ error: 'Bad user id' });
    }

    const [[u]] = await pool.query(
      `SELECT id, login, full_name AS fullName, email, email_confirmed AS emailConfirmed,
              avatar_url AS avatarUrl, role, rating, created_at AS createdAt, updated_at AS updatedAt
       FROM Users WHERE id=?`,
      [pathId]
    );
    if (!u) return res.status(404).json({ error: 'User not found' });
    res.json(u);
  } catch (e) { next(e); }
});

router.post('/', auth(true), requireRole('admin'), validate(userCreateSchema), async (req, res, next) => {
  try {
    const { login, password, fullName, email, role } = req.body;
    const { hashPassword } = await import('../../utils/password.js');
    const passwordHash = await hashPassword(password);
    const [r] = await pool.query(
      `INSERT INTO Users (login, password_hash, full_name, email, email_confirmed, role)
       VALUES (?,?,?,?,1,?)`,
      [login, passwordHash, fullName, email, role]
    );
    const [[u]] = await pool.query(
      `SELECT id, login, full_name AS fullName, email, email_confirmed AS emailConfirmed,
              avatar_url AS avatarUrl, role, rating, created_at AS createdAt, updated_at AS updatedAt
       FROM Users WHERE id=?`,
      [r.insertId]
    );
    res.status(201).json(u);
  } catch (e) { next(e); }
});

router.patch('/:id', auth(true), validate(userUpdateSchema), async (req, res, next) => {
  try {
    const pathId = Number(req.params.id);
    if (Number.isNaN(pathId) || pathId <= 0) {
      return res.status(400).json({ error: 'Bad user id' });
    }

    const myId = getAuthedUserIdOr401(req, res);
    if (myId == null) return;

    const [[exists]] = await pool.query(`SELECT id FROM Users WHERE id=?`, [pathId]);
    if (!exists) return res.status(404).json({ error: 'User not found' });

    if (req.user.role !== 'admin' && myId !== pathId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { fullName, email, role } = req.body;
    if (fullName !== undefined) await pool.query(`UPDATE Users SET full_name=? WHERE id=?`, [fullName, pathId]);
    if (email !== undefined) await pool.query(`UPDATE Users SET email=? WHERE id=?`, [email, pathId]);
    if (role !== undefined) {
      if (req.user.role !== 'admin') return res.status(403).json({ error: 'Role change forbidden' });
      await pool.query(`UPDATE Users SET role=? WHERE id=?`, [role, pathId]);
    }

    const [[u]] = await pool.query(
      `SELECT id, login, full_name AS fullName, email, email_confirmed AS emailConfirmed,
              avatar_url AS avatarUrl, role, rating, created_at AS createdAt, updated_at AS updatedAt
       FROM Users WHERE id=?`,
      [pathId]
    );
    res.json(u);
  } catch (e) { next(e); }
});

router.delete('/:id', auth(true), async (req, res, next) => {
  try {
    const pathId = Number(req.params.id);
    if (Number.isNaN(pathId) || pathId <= 0) {
      return res.status(400).json({ error: 'Bad user id' });
    }

    const myId = getAuthedUserIdOr401(req, res);
    if (myId == null) return;

    if (req.user.role !== 'admin' && myId !== pathId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const [r] = await pool.query(`DELETE FROM Users WHERE id=?`, [pathId]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
    res.status(204).send();
  } catch (e) { next(e); }
});

router.get('/:id/favorites', auth(true), async (req, res, next) => {
  try {
    const pathId = Number(req.params.id);
    if (Number.isNaN(pathId) || pathId <= 0) {
      return res.status(400).json({ error: 'Bad user id' });
    }

    const myId = getAuthedUserIdOr401(req, res);
    if (myId == null) return;

    if (req.user.role !== 'admin' && myId !== pathId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const [rows] = await pool.query(
      `
      SELECT
        p.id, p.title, p.content, p.status,
        p.likes_count AS likesCount, p.dislikes_count AS dislikesCount,
        p.created_at AS createdAt, p.updated_at AS updatedAt,
        u.id AS authorId, u.login AS authorLogin, u.full_name AS authorFullName, u.rating AS authorRating,
        f.created_at AS favoritedAt
      FROM Favorites f
      JOIN Posts p ON p.id = f.post_id
      JOIN Users u ON u.id = p.author_id
      WHERE f.user_id = ?
        AND (
          p.status = 'active'
          OR p.author_id = ?
          OR ? = 'admin'
        )
      ORDER BY f.created_at DESC
      `,
      [pathId, pathId, req.user.role]
    );

    res.json(rows);
  } catch (e) { next(e); }
});


router.get('/:id/posts', auth(true), async (req, res, next) => {
  try {
    const pathId = Number(req.params.id);
    if (!Number.isFinite(pathId) || pathId <= 0) {
      return res.status(400).json({ error: 'Bad user id' });
    }

    const myId = getAuthedUserIdOr401(req, res);
    if (myId == null) return;

    const isOwner = myId === pathId;
    const isAdmin = req.user?.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const pageParam  = req.query.page;
    const limitParam = req.query.limit;
    const hasPaging  = pageParam !== undefined || limitParam !== undefined;

    const page  = Math.max(1, Number(pageParam)  || 1);
    const limit = Math.max(1, Math.min(200, Number(limitParam) || 100));

    const sort  = (req.query.sort === 'date') ? 'date' : 'likes';
    const order = (req.query.order === 'asc') ? 'ASC' : 'DESC';

    const sortExpr = sort === 'date' ? 'p.created_at' : 'p.likes_count';

    const [[{ cnt }]] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM Posts p WHERE p.author_id = ?`,
      [pathId]
    );

    if (!hasPaging) {
      const [rows] = await pool.query(
        `
        SELECT
          p.id, p.title, p.content, p.status,
          p.likes_count AS likesCount, p.dislikes_count AS dislikesCount,
          p.created_at AS createdAt, p.updated_at AS updatedAt,
          u.id AS authorId, u.login AS authorLogin, u.full_name AS authorFullName, u.rating AS authorRating
        FROM Posts p
        JOIN Users u ON u.id = p.author_id
        WHERE p.author_id = ?
        ORDER BY ${sortExpr} ${order}, p.id DESC
        `,
        [pathId]
      );
      return res.json(rows);
    }

    const offset = (page - 1) * limit;
    const [items] = await pool.query(
      `
      SELECT
        p.id, p.title, p.content, p.status,
        p.likes_count AS likesCount, p.dislikes_count AS dislikesCount,
        p.created_at AS createdAt, p.updated_at AS updatedAt,
        u.id AS authorId, u.login AS authorLogin, u.full_name AS authorFullName, u.rating AS authorRating
      FROM Posts p
      JOIN Users u ON u.id = p.author_id
      WHERE p.author_id = ?
      ORDER BY ${sortExpr} ${order}, p.id DESC
      LIMIT ? OFFSET ?
      `,
      [pathId, limit, offset]
    );

    res.json({
      total: Number(cnt) || 0,
      page,
      limit,
      items
    });
  } catch (e) { next(e); }
});

export default router;
