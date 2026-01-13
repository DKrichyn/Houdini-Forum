import { Router } from 'express';
import { auth } from '../middlewares/auth.js';
import { pool } from '../../storage/db.js';
import { validate } from '../middlewares/validate.js';
import { postsListQuerySchema, postCreateSchema, postUpdateSchema, likeBodySchema } from '../../utils/validationSchemas.js';
import { recomputeUserRating } from '../../services/ratingService.js';

const router = Router();

router.get('/', auth(false), validate(postsListQuerySchema), async (req, res, next) => {
  try {
    const {
      sort = 'likes',
      order = 'desc',
      page = 1,
      limit = 10,
      categories,
      from,
      to,
      favorite
    } = req.query;
    let { status = 'active' } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const isAdmin = req.user?.role === 'admin';
    const userId = req.user?.id ? Number(req.user.id) : null;

    if (!isAdmin && status === 'all') status = 'active';

    const where = [];
    const params = [];

    let joinFavorite = '';
    if (String(favorite) === 'true' || String(favorite) === '1') {
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      joinFavorite = `JOIN Favorites f ON f.post_id = p.id AND f.user_id = ?`;
      params.push(userId);
    }

    if (status === 'active') {
      where.push(`p.status='active'`);
    } else if (status === 'inactive') {
      if (isAdmin) where.push(`p.status='inactive'`);
      else if (userId) { where.push(`p.status='inactive' AND p.author_id=?`); params.push(userId); }
      else where.push(`p.status='active'`);
    } else if (status === 'all') {
      if (!isAdmin) where.push(`p.status='active'`);
    } else {
      where.push(`p.status='active'`);
    }

    if (from) { where.push(`p.created_at >= ?`); params.push(new Date(from)); }
    if (to)   { where.push(`p.created_at <= ?`); params.push(new Date(to)); }

    let joinCategory = '';
    if (categories) {
      joinCategory = `JOIN PostCategories pc ON pc.post_id = p.id`;
      if (Array.isArray(categories)) {
        const cs = categories.map(Number).filter(Boolean);
        if (cs.length) {
          where.push(`pc.category_id IN (${cs.map(() => '?').join(',')})`);
          params.push(...cs);
        }
      } else {
        joinCategory += ` JOIN Categories c ON c.id=pc.category_id`;
        where.push(`c.title = ?`);
        params.push(String(categories));
      }
    }

    const orderBy = sort === 'likes'
      ? `ORDER BY p.likes_count ${order.toUpperCase()==='ASC'?'ASC':'DESC'}`
      : `ORDER BY p.created_at ${order.toUpperCase()==='ASC'?'ASC':'DESC'}`;

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `
      SELECT SQL_CALC_FOUND_ROWS
        p.id, p.title, p.content, p.status,
        p.likes_count AS likesCount, p.dislikes_count AS dislikesCount,
        p.created_at AS createdAt, p.updated_at AS updatedAt,
        u.id AS authorId, u.login AS authorLogin, u.full_name AS authorFullName, u.rating AS authorRating
      FROM Posts p
      JOIN Users u ON u.id=p.author_id
      ${joinFavorite}
      ${joinCategory}
      ${whereSql}
      ${orderBy}
      LIMIT ? OFFSET ?
      `,
      [...params, Number(limit), offset]
    );

    const [[{ 'FOUND_ROWS()': total }]] = await pool.query(`SELECT FOUND_ROWS()`);
    res.json({ total: Number(total), page: Number(page), limit: Number(limit), items: rows });
  } catch (e) { next(e); }
});

router.post('/', auth(true), validate(postCreateSchema), async (req, res, next) => {
  try {
    const { title, content, categories = [] } = req.body;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [r] = await conn.query(
        `INSERT INTO Posts (title, content, status, author_id) VALUES (?,?, 'active', ?)`,
        [title, content, req.user.id]
      );
      const postId = r.insertId;
      if (Array.isArray(categories) && categories.length) {
        const catRows = await conn.query(
          `SELECT id FROM Categories WHERE id IN (${categories.map(()=>'?').join(',')})`,
          categories
        );
        const present = catRows[0].map(c => c.id);
        for (const cid of present) {
          await conn.query(`INSERT INTO PostCategories (post_id, category_id) VALUES (?,?)`, [postId, cid]);
        }
      }
      await conn.commit();
      const [[post]] = await pool.query(
        `SELECT id, title, content, status, author_id AS authorId, likes_count AS likesCount,
                dislikes_count AS dislikesCount, created_at AS createdAt, updated_at AS updatedAt
         FROM Posts WHERE id=?`, [postId]
      );
      res.status(201).json(post);
    } catch (e) {
      await conn.rollback(); throw e;
    } finally {
      conn.release();
    }
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const [[p]] = await pool.query(
      `
      SELECT p.id, p.title, p.content, p.status,
             p.likes_count AS likesCount, p.dislikes_count AS dislikesCount,
             p.created_at AS createdAt, p.updated_at AS updatedAt,
             u.id AS authorId, u.login AS authorLogin, u.full_name AS authorFullName, u.rating AS authorRating
      FROM Posts p
      JOIN Users u ON u.id=p.author_id
      WHERE p.id=?
      `,
      [req.params.id]
    );
    if (!p) return res.status(404).json({ error: 'Post not found' });
    res.json(p);
  } catch (e) { next(e); }
});

router.patch('/:id', auth(true), validate(postUpdateSchema), async (req, res, next) => {
  try {
    const [[post]] = await pool.query(`SELECT id, author_id AS authorId FROM Posts WHERE id=?`, [req.params.id]);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const isOwner = post.authorId === Number(req.user.id);
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Forbidden' });

    const { title, content, categories, status } = req.body;

    if (title !== undefined) await pool.query(`UPDATE Posts SET title=? WHERE id=?`, [title, req.params.id]);
    if (content !== undefined) {
      if (!isOwner && isAdmin) return res.status(403).json({ error: 'Admin cannot edit content' });
      await pool.query(`UPDATE Posts SET content=? WHERE id=?`, [content, req.params.id]);
    }
    if (status !== undefined) {
      if (!isAdmin) return res.status(403).json({ error: 'Only admin can change status' });
      await pool.query(`UPDATE Posts SET status=? WHERE id=?`, [status, req.params.id]);
    }
    if (Array.isArray(categories)) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.query(`DELETE FROM PostCategories WHERE post_id=?`, [req.params.id]);
        if (categories.length) {
          for (const cid of categories) {
            await conn.query(`INSERT INTO PostCategories (post_id, category_id) VALUES (?,?)`, [req.params.id, cid]);
          }
        }
        await conn.commit();
      } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
    }

    const [[out]] = await pool.query(
      `SELECT id, title, content, status, author_id AS authorId, likes_count AS likesCount,
              dislikes_count AS dislikesCount, created_at AS createdAt, updated_at AS updatedAt
       FROM Posts WHERE id=?`, [req.params.id]
    );
    res.json(out);
  } catch (e) { next(e); }
});

router.delete('/:id', auth(true), async (req, res, next) => {
  try {
    const [[p]] = await pool.query(`SELECT id, author_id AS authorId FROM Posts WHERE id=?`, [req.params.id]);
    if (!p) return res.status(404).json({ error: 'Post not found' });
    if (p.authorId !== Number(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await pool.query(`DELETE FROM Posts WHERE id=?`, [req.params.id]);
    res.status(204).send();
  } catch (e) { next(e); }
});

router.get('/:id/comments', async (req, res, next) => {
  try {
    const [comments] = await pool.query(
      `SELECT id, post_id AS postId, author_id AS authorId, content, status,
              likes_count AS likesCount, dislikes_count AS dislikesCount,
              created_at AS createdAt, updated_at AS updatedAt
       FROM Comments WHERE post_id=? ORDER BY created_at ASC`,
      [req.params.id]
    );
    res.json(comments);
  } catch (e) { next(e); }
});

router.get('/:id/categories', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.title, c.description, c.slug
       FROM PostCategories pc JOIN Categories c ON c.id=pc.category_id
       WHERE pc.post_id=?`,
      [req.params.id]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

router.get('/:id/like', async (req, res, next) => {
  try {
    const [likes] = await pool.query(
      `SELECT id, author_id AS authorId, target_type AS targetType, target_id AS targetId, type,
              created_at AS createdAt
       FROM Likes WHERE target_type='post' AND target_id=?`,
      [req.params.id]
    );
    res.json(likes);
  } catch (e) { next(e); }
});

router.post('/:id/like', auth(true), validate(likeBodySchema), async (req, res, next) => {
  try {
    const postId = Number(req.params.id);
    const [[existing]] = await pool.query(
      `SELECT id FROM Likes WHERE target_type='post' AND target_id=? AND author_id=?`,
      [postId, req.user.id]
    );
    if (existing) return res.status(409).json({ error: 'Already liked' });

    const [r] = await pool.query(
      `INSERT INTO Likes (author_id, target_type, target_id, type) VALUES (?,?,?,?)`,
      [req.user.id, 'post', postId, req.body.type || 'like']
    );

    const [[likeCount]] = await pool.query(
      `SELECT
         SUM(CASE WHEN type='like' THEN 1 ELSE 0 END) AS lc,
         SUM(CASE WHEN type='dislike' THEN 1 ELSE 0 END) AS dc
       FROM Likes WHERE target_type='post' AND target_id=?`,
      [postId]
    );
    await pool.query(
      `UPDATE Posts SET likes_count=?, dislikes_count=? WHERE id=?`,
      [likeCount.lc || 0, likeCount.dc || 0, postId]
    );

    const [[p]] = await pool.query(`SELECT author_id AS authorId FROM Posts WHERE id=?`, [postId]);
    if (p) await recomputeUserRating(p.authorId);

    const [[out]] = await pool.query(
      `SELECT id, author_id AS authorId, target_type AS targetType, target_id AS targetId, type,
              created_at AS createdAt
       FROM Likes WHERE id=?`, [r.insertId]
    );
    res.status(201).json(out);
  } catch (e) { next(e); }
});

router.delete('/:id/like', auth(true), async (req, res, next) => {
  try {
    const postId = Number(req.params.id);
    const [[like]] = await pool.query(
      `SELECT id, type FROM Likes WHERE target_type='post' AND target_id=? AND author_id=?`,
      [postId, req.user.id]
    );
    if (!like) return res.status(404).json({ error: 'Like not found' });

    await pool.query(`DELETE FROM Likes WHERE id=?`, [like.id]);

    const [[likeCount]] = await pool.query(
      `SELECT
         SUM(CASE WHEN type='like' THEN 1 ELSE 0 END) AS lc,
         SUM(CASE WHEN type='dislike' THEN 1 ELSE 0 END) AS dc
       FROM Likes WHERE target_type='post' AND target_id=?`,
      [postId]
    );
    await pool.query(
      `UPDATE Posts SET likes_count=?, dislikes_count=? WHERE id=?`,
      [likeCount.lc || 0, likeCount.dc || 0, postId]
    );

    const [[p]] = await pool.query(`SELECT author_id AS authorId FROM Posts WHERE id=?`, [postId]);
    if (p) await recomputeUserRating(p.authorId);

    res.status(204).send();
  } catch (e) { next(e); }
});

async function canSeePost(user, postId) {
  const [[p]] = await pool.query(`SELECT id, status, author_id AS authorId FROM Posts WHERE id=?`, [postId]);
  if (!p) return { ok: false, code: 404, msg: 'Post not found' };
  if (p.status === 'active') return { ok: true };
  if (!user) return { ok: false, code: 403, msg: 'Forbidden' };
  if (user.role === 'admin' || Number(user.id) === Number(p.authorId)) return { ok: true };
  return { ok: false, code: 403, msg: 'Forbidden' };
}

router.post('/:id/favorite', auth(true), async (req, res, next) => {
  try {
    const postId = Number(req.params.id);
    const vis = await canSeePost(req.user, postId);
    if (!vis.ok) return res.status(vis.code).json({ error: vis.msg });

    const [[exists]] = await pool.query(
      `SELECT 1 FROM Favorites WHERE user_id=? AND post_id=?`,
      [req.user.id, postId]
    );
    if (exists) return res.status(409).json({ error: 'Already in favorites' });

    await pool.query(`INSERT INTO Favorites (user_id, post_id) VALUES (?,?)`, [req.user.id, postId]);
    res.status(201).json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/:id/favorite', auth(true), async (req, res, next) => {
  try {
    const postId = Number(req.params.id);
    const [r] = await pool.query(
      `DELETE FROM Favorites WHERE user_id=? AND post_id=?`,
      [req.user.id, postId]
    );
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Not in favorites' });
    res.status(204).send();
  } catch (e) { next(e); }
});

export default router;
